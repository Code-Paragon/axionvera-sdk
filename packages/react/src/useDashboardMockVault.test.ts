import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  useDashboardMockVault,
  useDashboardMockScenario
} from './useDashboardMockVault';

const CONTRACT_ID = 'CVAULT_MOCK_CONTRACT';
const USER_ADDRESS = 'GMOCK_USER_ADDRESS';

describe('useDashboardMockVault', () => {
  describe('initialization', () => {
    it('initializes client on mount when autoInitialize is true', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: { contractId: CONTRACT_ID },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
        expect(result.current.isInitializing).toBe(false);
      });
    });

    it('does not initialize when autoInitialize is false', () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: { contractId: CONTRACT_ID },
          autoInitialize: false
        })
      );

      expect(result.current.client).toBeNull();
      expect(result.current.isInitializing).toBe(false);
    });

    it('sets error state on initialization failure', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: { contractId: '' }, // Invalid contract ID
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.client).toBeNull();
      });
    });
  });

  describe('manual initialization', () => {
    it('initializes client when initialize is called', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: { contractId: CONTRACT_ID },
          autoInitialize: false
        })
      );

      expect(result.current.client).toBeNull();

      result.current.initialize();

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });
    });
  });

  describe('state management', () => {
    it('provides current mock state', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: {
            contractId: CONTRACT_ID,
            initialBalances: { [USER_ADDRESS]: 1000n }
          },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.state).not.toBeNull();
      });

      expect(result.current.state?.balances.get(USER_ADDRESS)).toBe(1000n);
    });

    it('updates state directly via setState', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: { contractId: CONTRACT_ID },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      const newBalances = new Map([[USER_ADDRESS, 5000n]]);
      result.current.setState({ balances: newBalances });

      await waitFor(() => {
        expect(result.current.state?.balances.get(USER_ADDRESS)).toBe(5000n);
      });
    });

    it('refreshes state via refreshState', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: {
            contractId: CONTRACT_ID,
            initialBalances: { [USER_ADDRESS]: 1000n }
          },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      // Manually modify client state
      result.current.client?.setState({
        balances: new Map([[USER_ADDRESS, 2000n]])
      });

      result.current.refreshState();

      await waitFor(() => {
        expect(result.current.state?.balances.get(USER_ADDRESS)).toBe(2000n);
      });
    });
  });

  describe('vault operations', () => {
    it('provides getInfo method', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: {
            contractId: CONTRACT_ID,
            initialInfo: { assetCode: 'XLM' }
          },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      const info = await result.current.getInfo();
      expect(info.contractId).toBe(CONTRACT_ID);
      expect(info.assetCode).toBe('XLM');
    });

    it('provides getBalance method', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: {
            contractId: CONTRACT_ID,
            initialBalances: { [USER_ADDRESS]: 1000n }
          },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      const balance = await result.current.getBalance(USER_ADDRESS);
      expect(balance.amount).toBe(1000n);
    });

    it('provides getPendingRewards method', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: {
            contractId: CONTRACT_ID,
            initialRewards: { [USER_ADDRESS]: 50n }
          },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      const rewards = await result.current.getPendingRewards(USER_ADDRESS);
      expect(rewards.amount).toBe(50n);
    });

    it('provides deposit method', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: {
            contractId: CONTRACT_ID,
            initialBalances: { [USER_ADDRESS]: 1000n }
          },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      const tx = await result.current.deposit(USER_ADDRESS, 500n);
      expect(tx.status).toBe('success');

      await waitFor(() => {
        expect(result.current.state?.balances.get(USER_ADDRESS)).toBe(1500n);
      });
    });

    it('provides withdraw method', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: {
            contractId: CONTRACT_ID,
            initialBalances: { [USER_ADDRESS]: 1000n }
          },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      const tx = await result.current.withdraw(USER_ADDRESS, 500n);
      expect(tx.status).toBe('success');

      await waitFor(() => {
        expect(result.current.state?.balances.get(USER_ADDRESS)).toBe(500n);
      });
    });

    it('provides claimRewards method', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: {
            contractId: CONTRACT_ID,
            initialBalances: { [USER_ADDRESS]: 1000n },
            initialRewards: { [USER_ADDRESS]: 50n }
          },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      const tx = await result.current.claimRewards(USER_ADDRESS);
      expect(tx.status).toBe('success');

      await waitFor(() => {
        expect(result.current.state?.balances.get(USER_ADDRESS)).toBe(1050n);
        expect(result.current.state?.rewards.get(USER_ADDRESS)).toBe(0n);
      });
    });

    it('provides getTransactionHistory method', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: { contractId: CONTRACT_ID },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      await result.current.deposit(USER_ADDRESS, 100n);
      await result.current.deposit(USER_ADDRESS, 200n);

      const history = result.current.getTransactionHistory();
      expect(history).toHaveLength(2);
    });

    it('respects limit parameter in getTransactionHistory', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: { contractId: CONTRACT_ID },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      await result.current.deposit(USER_ADDRESS, 100n);
      await result.current.deposit(USER_ADDRESS, 200n);
      await result.current.deposit(USER_ADDRESS, 300n);

      const history = result.current.getTransactionHistory(2);
      expect(history).toHaveLength(2);
    });
  });

  describe('reset functionality', () => {
    it('resets client state', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: {
            contractId: CONTRACT_ID,
            initialBalances: { [USER_ADDRESS]: 1000n }
          },
          autoInitialize: true
        })
      );

      await waitFor(() => {
        expect(result.current.client).not.toBeNull();
      });

      await result.current.deposit(USER_ADDRESS, 500n);
      expect(result.current.state?.balances.get(USER_ADDRESS)).toBe(1500n);

      result.current.reset();

      await waitFor(() => {
        expect(result.current.state?.balances.size).toBe(0);
      });
    });
  });

  describe('error handling', () => {
    it('throws when operations called before initialization', async () => {
      const { result } = renderHook(() =>
        useDashboardMockVault({
          clientOptions: { contractId: CONTRACT_ID },
          autoInitialize: false
        })
      );

      await expect(result.current.getInfo()).rejects.toThrow('Client not initialized');
      await expect(result.current.getBalance(USER_ADDRESS)).rejects.toThrow('Client not initialized');
      await expect(result.current.deposit(USER_ADDRESS, 100n)).rejects.toThrow('Client not initialized');
    });
  });
});

describe('useDashboardMockScenario', () => {
  it('creates empty scenario', async () => {
    const { result } = renderHook(() => useDashboardMockScenario('empty'));

    await waitFor(() => {
      expect(result.current.client).not.toBeNull();
    });

    expect(result.current.state?.balances.size).toBe(0);
    expect(result.current.state?.rewards.size).toBe(0);
  });

  it('creates active scenario', async () => {
    const { result } = renderHook(() => useDashboardMockScenario('active'));

    await waitFor(() => {
      expect(result.current.client).not.toBeNull();
    });

    expect(result.current.state?.balances.size).toBeGreaterThan(0);
    expect(result.current.state?.totalDeposits).toBe(4000n);
  });

  it('creates rewards scenario', async () => {
    const { result } = renderHook(() => useDashboardMockScenario('rewards'));

    await waitFor(() => {
      expect(result.current.client).not.toBeNull();
    });

    const rewards = Array.from(result.current.state?.rewards?.values() || []);
    expect(rewards[0]).toBe(200n);
  });

  it('creates error scenario', async () => {
    const { result } = renderHook(() => useDashboardMockScenario('error'));

    await waitFor(() => {
      expect(result.current.client).not.toBeNull();
    });

    expect(result.current.client?.contractId).toBe('CVAULT_MOCK_CONTRACT_ID');
  });

  it('accepts custom contract ID', async () => {
    const customContractId = 'CCUSTOM_CONTRACT';
    const { result } = renderHook(() =>
      useDashboardMockScenario('active', customContractId)
    );

    await waitFor(() => {
      expect(result.current.client).not.toBeNull();
    });

    expect(result.current.client?.contractId).toBe(customContractId);
  });

  it('provides all vault operations', async () => {
    const { result } = renderHook(() => useDashboardMockScenario('active'));

    await waitFor(() => {
      expect(result.current.client).not.toBeNull();
    });

    // Test that all methods are available
    expect(typeof result.current.getInfo).toBe('function');
    expect(typeof result.current.getBalance).toBe('function');
    expect(typeof result.current.getPendingRewards).toBe('function');
    expect(typeof result.current.deposit).toBe('function');
    expect(typeof result.current.withdraw).toBe('function');
    expect(typeof result.current.claimRewards).toBe('function');
    expect(typeof result.current.getTransactionHistory).toBe('function');
  });
});