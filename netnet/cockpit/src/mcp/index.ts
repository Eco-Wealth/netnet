import MCPClient from './client';
import RegenAdapter from './adapters/regen';
import BaseAdapter from './adapters/base';
import EthAdapter from './adapters/eth';

export function createStubMCPClient(): MCPClient {
  return new MCPClient([
    new RegenAdapter(),
    new BaseAdapter(),
    new EthAdapter()
  ]);
}