import { describe, expect, it } from 'vitest';
import { ValidationError } from '../errors';
import {
  DashboardMockVaultClient,
  createDashboardMockVaultClient,
  createDashboardMockClientForScenario
} from './dashboardMockVaultClient';

const CONTRACT_ID = 'CVAULT_MOCK_CONTRACT_ID';
const USER_ADDRESS = 'GMOCK_USER_ADDRESS';
const ADMIN_ADDRESS = 'GMOCK_ADMIN_ADDRESS';

describe('DashboardMockVaultClient', () => {
  describe('constructor', () => {
    it('creates a client with required contractId', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      expect(client.contractId).toBe(CONTRACT_ID);
    });

    it('throws ValidationError when contractId is empty', () => {
      expect(() => new DashboardMockVaultClient({ contractId: '' })).toThrow(ValidationError);
    });

    it('throws ValidationError when contractId is whitespace', () => {
      expect(() => new DashboardMockVaultClient({ contractId: '   ' })).toThrow(ValidationError);
    });

    it('initializes with provided initial balances', () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: {
          [USER_ADDRESS]: 1000n,
          [ADMIN_ADDRESS]: 5000n
        }
      });

      const state = client.getState();
      expect(state.balances.get(USER_ADDRESS)).toBe(1000n);
      expect(state.balances.get(ADMIN_ADDRESS)).toBe(5000n);
    });

    it('initializes with provided initial rewards', () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialRewards: {
          [USER_ADDRESS]: 50n,
          [ADMIN_ADDRESS]: 100n
        }
      });

      const state = client.getState();
      expect(state.rewards.get(USER_ADDRESS)).toBe(50n);
      expect(state.rewards.get(ADMIN_ADDRESS)).toBe(100n);
    });
  });

  describe('getInfo', () => {
    it('returns vault information', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialInfo: {
          assetCode: 'XLM',
          assetIssuer: 'GISSUER'
        }
      });

      const info = await client.getInfo();
      expect(info.contractId).toBe(CONTRACT_ID);
      expect(info.assetCode).toBe('XLM');
      expect(info.assetIssuer).toBe('GISSUER');
    });

    it('returns default values when not provided', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const info = await client.getInfo();
      expect(info.contractId).toBe(CONTRACT_ID);
      expect(info.assetCode).toBe('XLM');
    });
  });

  describe('getBalance', () => {
    it('returns balance for existing address', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n }
      });

      const balance = await client.getBalance(USER_ADDRESS);
      expect(balance.address).toBe(USER_ADDRESS);
      expect(balance.amount).toBe(1000n);
    });

    it('returns zero balance for non-existent address', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const balance = await client.getBalance(USER_ADDRESS);
      expect(balance.address).toBe(USER_ADDRESS);
      expect(balance.amount).toBe(0n);
    });

    it('throws ValidationError when address is empty', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      await expect(client.getBalance('')).rejects.toThrow(ValidationError);
    });

    it('trims whitespace from address', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n }
      });

      const balance = await client.getBalance(`  ${USER_ADDRESS}  `);
      expect(balance.address).toBe(USER_ADDRESS);
      expect(balance.amount).toBe(1000n);
    });
  });

  describe('getPendingRewards', () => {
    it('returns rewards for existing address', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialRewards: { [USER_ADDRESS]: 50n }
      });

      const rewards = await client.getPendingRewards(USER_ADDRESS);
      expect(rewards.address).toBe(USER_ADDRESS);
      expect(rewards.amount).toBe(50n);
    });

    it('returns zero rewards for non-existent address', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const rewards = await client.getPendingRewards(USER_ADDRESS);
      expect(rewards.address).toBe(USER_ADDRESS);
      expect(rewards.amount).toBe(0n);
    });

    it('throws ValidationError when address is empty', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      await expect(client.getPendingRewards('')).rejects.toThrow(ValidationError);
    });
  });

  describe('deposit', () => {
    it('increases user balance', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n }
      });

      await client.deposit(USER_ADDRESS, 500n);
      const balance = await client.getBalance(USER_ADDRESS);
      expect(balance.amount).toBe(1500n);
    });

    it('increases total deposits', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialTotalDeposits: 1000n
      });

      await client.deposit(USER_ADDRESS, 500n);
      const state = client.getState();
      expect(state.totalDeposits).toBe(1500n);
    });

    it('creates a successful transaction', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const tx = await client.deposit(USER_ADDRESS, 100n);
      expect(tx.status).toBe('success');
      expect(tx.hash).toMatch(/^tx_deposit_\d+$/);
    });

    it('accepts different amount types', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      await client.deposit(USER_ADDRESS, 100n);
      await client.deposit(USER_ADDRESS, 100);
      await client.deposit(USER_ADDRESS, '100');
      
      const balance = await client.getBalance(USER_ADDRESS);
      expect(balance.amount).toBe(300n);
    });

    it('adds transaction to history', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      await client.deposit(USER_ADDRESS, 100n);
      
      const history = client.getTransactionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe('success');
    });
  });

  describe('withdraw', () => {
    it('decreases user balance when sufficient funds', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n }
      });

      await client.withdraw(USER_ADDRESS, 500n);
      const balance = await client.getBalance(USER_ADDRESS);
      expect(balance.amount).toBe(500n);
    });

    it('decreases total deposits', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n },
        initialTotalDeposits: 1000n
      });

      await client.withdraw(USER_ADDRESS, 500n);
      const state = client.getState();
      expect(state.totalDeposits).toBe(500n);
    });

    it('returns failed transaction when insufficient balance', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 100n }
      });

      const tx = await client.withdraw(USER_ADDRESS, 500n);
      expect(tx.status).toBe('failed');
      expect(tx.raw).toEqual({ error: 'Insufficient balance' });
    });

    it('does not change balance on failed withdrawal', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 100n }
      });

      await client.withdraw(USER_ADDRESS, 500n);
      const balance = await client.getBalance(USER_ADDRESS);
      expect(balance.amount).toBe(100n);
    });
  });

  describe('claimRewards', () => {
    it('adds rewards to user balance', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n },
        initialRewards: { [USER_ADDRESS]: 50n }
      });

      await client.claimRewards(USER_ADDRESS);
      const balance = await client.getBalance(USER_ADDRESS);
      expect(balance.amount).toBe(1050n);
    });

    it('clears user rewards after claiming', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialRewards: { [USER_ADDRESS]: 50n }
      });

      await client.claimRewards(USER_ADDRESS);
      const rewards = await client.getPendingRewards(USER_ADDRESS);
      expect(rewards.amount).toBe(0n);
    });

    it('decreases reward pool', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialRewards: { [USER_ADDRESS]: 50n },
        initialRewardPool: 1000n
      });

      await client.claimRewards(USER_ADDRESS);
      const state = client.getState();
      expect(state.rewardPool).toBe(950n);
    });

    it('returns failed transaction when no rewards to claim', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n }
      });

      const tx = await client.claimRewards(USER_ADDRESS);
      expect(tx.status).toBe('failed');
      expect(tx.raw).toEqual({ error: 'No rewards to claim' });
    });
  });

  describe('getTransactionHistory', () => {
    it('returns empty history initially', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const history = client.getTransactionHistory();
      expect(history).toHaveLength(0);
    });

    it('returns transactions in reverse chronological order', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      await client.deposit(USER_ADDRESS, 100n);
      await client.deposit(USER_ADDRESS, 200n);
      await client.withdraw(USER_ADDRESS, 50n);
      
      const history = client.getTransactionHistory();
      expect(history).toHaveLength(3);
      expect(history[0].hash).toMatch(/^tx_withdraw_\d+$/);
      expect(history[1].hash).toMatch(/^tx_deposit_\d+$/);
      expect(history[2].hash).toMatch(/^tx_deposit_\d+$/);
    });

    it('respects limit parameter', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      await client.deposit(USER_ADDRESS, 100n);
      await client.deposit(USER_ADDRESS, 200n);
      await client.deposit(USER_ADDRESS, 300n);
      
      const history = client.getTransactionHistory(2);
      expect(history).toHaveLength(2);
    });
  });

  describe('getState', () => {
    it('returns current mock state', () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n }
      });

      const state = client.getState();
      expect(state.info.contractId).toBe(CONTRACT_ID);
      expect(state.balances.get(USER_ADDRESS)).toBe(1000n);
      expect(Array.isArray(state.transactions)).toBe(true);
    });

    it('returns a copy of the state', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const state1 = client.getState();
      const state2 = client.getState();
      
      expect(state1).not.toBe(state2);
      expect(state1.balances).not.toBe(state2.balances);
    });
  });

  describe('setState', () => {
    it('updates vault info', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      client.setState({
        info: { contractId: CONTRACT_ID, assetCode: 'USD' }
      });
      
      const state = client.getState();
      expect(state.info.assetCode).toBe('USD');
    });

    it('updates balances', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      const newBalances = new Map([[USER_ADDRESS, 5000n]]);
      client.setState({ balances: newBalances });
      
      const state = client.getState();
      expect(state.balances.get(USER_ADDRESS)).toBe(5000n);
    });

    it('updates rewards', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      const newRewards = new Map([[USER_ADDRESS, 200n]]);
      client.setState({ rewards: newRewards });
      
      const state = client.getState();
      expect(state.rewards.get(USER_ADDRESS)).toBe(200n);
    });

    it('updates transactions', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      const newTransactions = [
        { hash: 'tx_custom_1', status: 'success' as const }
      ];
      client.setState({ transactions: newTransactions });
      
      const state = client.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].hash).toBe('tx_custom_1');
    });

    it('updates total deposits', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      client.setState({ totalDeposits: 10000n });
      
      const state = client.getState();
      expect(state.totalDeposits).toBe(10000n);
      expect(state.info.totalDeposits).toBe(10000n);
    });

    it('updates reward pool', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      client.setState({ rewardPool: 5000n });
      
      const state = client.getState();
      expect(state.rewardPool).toBe(5000n);
      expect(state.info.rewardPool).toBe(5000n);
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n },
        initialRewards: { [USER_ADDRESS]: 50n }
      });

      await client.deposit(USER_ADDRESS, 100n);
      client.reset();

      const state = client.getState();
      expect(state.balances.size).toBe(0);
      expect(state.rewards.size).toBe(0);
      expect(state.transactions).toHaveLength(0);
    });

    it('resets transaction counter', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      
      await client.deposit(USER_ADDRESS, 100n);
      const tx1 = await client.deposit(USER_ADDRESS, 100n);
      
      client.reset();
      const tx2 = await client.deposit(USER_ADDRESS, 100n);
      
      expect(tx1.hash).toBe('tx_deposit_2');
      expect(tx2.hash).toBe('tx_deposit_1');
    });
  });

  describe('asContractInvoker', () => {
    it('creates a compatible ContractInvoker', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const invoker = client.asContractInvoker();
      
      expect(invoker.invoke).toBeInstanceOf(Function);
      expect(invoker.read).toBeInstanceOf(Function);
    });

    it('routes read methods correctly', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n }
      });
      const invoker = client.asContractInvoker();

      const balance = await invoker.read({
        contractId: CONTRACT_ID,
        method: 'get_balance',
        args: [USER_ADDRESS]
      });

      expect(balance).toEqual({ address: USER_ADDRESS, amount: 1000n });
    });

    it('routes invoke methods correctly', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const invoker = client.asContractInvoker();

      const tx = await invoker.invoke({
        contractId: CONTRACT_ID,
        method: 'deposit',
        args: [USER_ADDRESS, 100n]
      });

      expect(tx.status).toBe('success');
      expect(tx.hash).toMatch(/^tx_deposit_\d+$/);
    });

    it('throws on contract ID mismatch', async () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const invoker = client.asContractInvoker();

      await expect(
        invoker.read({
          contractId: 'COTHER_CONTRACT',
          method: 'get_balance',
          args: [USER_ADDRESS]
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('asVaultContract', () => {
    it('creates a VaultContract instance', () => {
      const client = new DashboardMockVaultClient({ contractId: CONTRACT_ID });
      const vaultContract = client.asVaultContract();
      
      expect(vaultContract.contractId).toBe(CONTRACT_ID);
    });

    it('VaultContract methods work correctly', async () => {
      const client = new DashboardMockVaultClient({
        contractId: CONTRACT_ID,
        initialBalances: { [USER_ADDRESS]: 1000n }
      });
      const vaultContract = client.asVaultContract();

      const balance = await vaultContract.getBalance(USER_ADDRESS);
      expect(balance.amount).toBe(1000n);

      const tx = await vaultContract.deposit(USER_ADDRESS, 500n);
      expect(tx.status).toBe('success');

      const newBalance = await vaultContract.getBalance(USER_ADDRESS);
      expect(newBalance.amount).toBe(1500n);
    });
  });
});

describe('createDashboardMockVaultClient', () => {
  it('creates a configured client instance', () => {
    const client = createDashboardMockVaultClient({
      contractId: CONTRACT_ID,
      initialBalances: { [USER_ADDRESS]: 1000n }
    });

    expect(client).toBeInstanceOf(DashboardMockVaultClient);
    expect(client.contractId).toBe(CONTRACT_ID);
  });
});

describe('createDashboardMockClientForScenario', () => {
  it('creates empty scenario', () => {
    const client = createDashboardMockClientForScenario('empty');
    const state = client.getState();
    
    expect(state.balances.size).toBe(0);
    expect(state.rewards.size).toBe(0);
    expect(state.totalDeposits).toBe(0n);
  });

  it('creates active scenario', () => {
    const client = createDashboardMockClientForScenario('active');
    const state = client.getState();
    
    expect(state.balances.size).toBeGreaterThan(0);
    expect(state.rewards.size).toBeGreaterThan(0);
    expect(state.totalDeposits).toBe(4000n);
  });

  it('creates rewards scenario', () => {
    const client = createDashboardMockClientForScenario('rewards');
    const state = client.getState();
    
    expect(state.balances.size).toBe(1);
    expect(state.rewards.size).toBe(1);
    const rewards = Array.from(state.rewards.values());
    expect(rewards[0]).toBe(200n);
  });

  it('creates error scenario', () => {
    const client = createDashboardMockClientForScenario('error');
    expect(client.contractId).toBe('CVAULT_MOCK_CONTRACT_ID');
  });

  it('accepts custom contract ID', () => {
    const customContractId = 'CCUSTOM_CONTRACT';
    const client = createDashboardMockClientForScenario('active', customContractId);
    expect(client.contractId).toBe(customContractId);
  });

  it('throws for unknown scenario', () => {
    expect(() => createDashboardMockClientForScenario('unknown' as any)).toThrow(ValidationError);
  });
});