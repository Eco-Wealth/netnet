import MCPClient from './client';
import RegenAdapter from './adapters/regen';
import BaseAdapter from './adapters/base';
import EthAdapter from './adapters/eth';
import RegistryReviewAdapter from './adapters/registry-review';
import RegenKoiAdapter from './adapters/regen-koi';
import RegenPythonAdapter from './adapters/regen-python';

export function createStubMCPClient(): MCPClient {
  return new MCPClient([
    new RegenAdapter(),
    new BaseAdapter(),
    new EthAdapter(),
    new RegistryReviewAdapter(),
    new RegenKoiAdapter(),
    new RegenPythonAdapter(),
  ]);
}
