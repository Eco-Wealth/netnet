#!/usr/bin/env python3
import json,subprocess,sys,os
from pathlib import Path

BACKLOG='backlog/units.json'
BRANCH_BASE='feature/vealth-unit-'

def load_units():
    return json.loads(Path(BACKLOG).read_text())

def save_units(units):
    Path(BACKLOG).write_text(json.dumps(units, indent=2))

def select_next(units):
    for u in units:
        if u['status']=='PENDING':
            return u
    return None

def run(cmd):
    print('RUN>',cmd)
    subprocess.check_call(cmd, shell=True)

def create_branch(branch):
    run(f'git fetch origin')
    run(f'git checkout test-vealth-branch')
    run(f'git checkout -b {branch}')

def implement_unit(unit):
    # Implementation placeholder: create a stub file and test
    uid=unit['id'].lower().replace('-','_')
    units_dir=Path('regenmind/units')
    units_dir.mkdir(parents=True, exist_ok=True)
    fname=units_dir / f'{uid}.py'
    content=f"""from regenmind.core.base import BaseUnit
from regenmind.core.telemetry.logger import emit
import time

class {unit['id'].replace('-','')}(BaseUnit):

    manifest = {{
        'unit_id': '{unit['id']}',
        'layer': 'data',
        'type': 'deterministic',
        'capital_impact': False,
        'audit_required': False
    }}

    def execute(self, state):
        start=time.time()
        state.__dict__.setdefault('meta',{{}})
        state.meta['last_run']='{unit['id']}'
        runtime=(time.time()-start)*1000
        try:
            emit(self.manifest['unit_id'],'success',runtime)
        except Exception:
            pass
        return state
"""
    fname.write_text(content)
    # test
    tests_dir=Path('tests')
    tests_dir.mkdir(exist_ok=True)
    testf=tests_dir / f'test_{uid}.py'
    testf.write_text(f"""from types import SimpleNamespace
from regenmind.units.{uid} import {unit['id'].replace('-','')}

def test_{uid}_exec():
    u={unit['id'].replace('-','')}()
    s=SimpleNamespace()
    out=u.execute(s)
    assert hasattr(out,'meta')
    assert out.meta['last_run']=='{unit['id']}'
""")
    return [str(fname), str(testf)]

def run_tests():
    # Use project's venv pytest if available
    if os.path.exists('.venv/bin/pytest'):
        cmd='.venv/bin/pytest -q'
    else:
        cmd='python3 -m pytest -q'
    run(cmd)

def commit_and_push(files, branch, unit_id):
    run('git add ' + ' '.join(files))
    run("git commit -m \"vealth: implement %s + test\"" % unit_id)
    run(f'git push origin {branch}')


if __name__=='__main__':
    units=load_units()
    unit=select_next(units)
    if not unit:
        print('No PENDING units')
        sys.exit(0)
    # mark in progress
    unit['status']='IN_PROGRESS'
    save_units(units)
    branch=BRANCH_BASE + unit['id'].lower()
    create_branch(branch)
    files=implement_unit(unit)
    try:
        run_tests()
    except Exception as e:
        print('Tests failed:', e)
        # leave status as IN_PROGRESS
        sys.exit(1)
    commit_and_push(files, branch)
    # Open PR via hub/gh if available
    try:
        run(f'gh pr create --fill --base test-vealth-branch --head {branch}')
    except Exception:
        print('gh CLI not available or PR creation failed')
    unit['status']='IN_REVIEW'
    save_units(units)
    print('Done: unit',unit['id'])
