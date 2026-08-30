import { useCallback, useEffect, useState } from 'react';
import {
  DashboardMockVaultClient,
  createDashboardMockVaultClient,
  createDashboardMockClientForScenario,
  type DashboardMockVaultClientOptions,
  type MockVaultState,
  type AmountInput,
  type VaultBalance,
  type VaultInfo,
  type VaultReward,
  type VaultTransaction
} from '@axionvera/core';

export interface UseDashboardMockVaultOptions {
  /** Configuration options for the mock vault client */
  clientOptions: DashboardMockVaultClientOptions;
  /** Whether to auto-initialize the client on mount */
  autoInitialize?: boolean;
}

export interface UseDashboardMockVaultResult {
  /** The mock vault client instance */
  client: DashboardMockVaultClient | null;
  /** Whether the client is initializing */
  isInitializing: boolean;
  /** Current mock vault state */
  state: MockVaultState | null;
  /** Error state */
  error: Error | null;
  /** Initialize the client manually */
  initialize(): void;
  /** Reset the client to initial state */
  reset(): void;
  /** Get vault information */
  getInfo(): Promise<VaultInfo>;
  /** Get balance for an address */
  getBalance(address: string): Promise<VaultBalance>;
  /** Get pending rewards for an address */
  getPendingRewards(address: string): Promise<VaultReward>;
  /** Deposit funds */
  deposit(from: string, amount: AmountInput): Promise<VaultTransaction>;
  /** Withdraw funds */
  withdraw(to: string, amount: AmountInput): Promise<VaultTransaction>;
  /** Claim rewards */
  claimRewards(address: string): Promise<VaultTransaction>;
  /** Get transaction history */
  getTransactionHistory(limit?: number): VaultTransaction[];
  /** Update mock state directly */
  setState(updates: Partial<MockVaultState>): void;
  /** Refresh the current state */
  refreshState(): void;
}

/**
 * React hook for using the dashboard mock vault client.
 * 
 * This hook provides a React-friendly interface to the DashboardMockVaultClient,
 * making it easy to integrate mocked vault functionality into dashboard UIs.
 * 
 * @example
 * ```tsx
 * function VaultDashboard() {
 *   const { client, state, getInfo, deposit, withdraw } = useDashboardMockVault({
 *     clientOptions: {
 *       contractId: 'CVAULT...',
 *       initialBalances: { 'GUSER...': 1000n }
 *     },
 *     autoInitialize: true
 *   });
 * 
 *   if (!client) return <div>Loading...</div>;
 * 
 *   return (
 *     <div>
 *       <button onClick={() => deposit('GUSER...', 100n)}>
 *         Deposit 100
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDashboardMockVault(
  options: UseDashboardMockVaultOptions
): UseDashboardMockVaultResult {
  const { clientOptions, autoInitialize = true } = options;
  
  const [client, setClient] = useState<DashboardMockVaultClient | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [state, setState] = useState<MockVaultState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const initialize = useCallback(() => {
    setIsInitializing(true);
    setError(null);
    
    try {
      const newClient = createDashboardMockVaultClient(clientOptions);
      setClient(newClient);
      setState(newClient.getState());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsInitializing(false);
    }
  }, [clientOptions]);

  const reset = useCallback(() => {
    if (client) {
      client.reset();
      setState(client.getState());
      setError(null);
    }
  }, [client]);

  const refreshState = useCallback(() => {
    if (client) {
      setState(client.getState());
    }
  }, [client]);

  const getInfo = useCallback(async (): Promise<VaultInfo> => {
    if (!client) throw new Error('Client not initialized');
    return await client.getInfo();
  }, [client]);

  const getBalance = useCallback(async (address: string): Promise<VaultBalance> => {
    if (!client) throw new Error('Client not initialized');
    const balance = await client.getBalance(address);
    refreshState();
    return balance;
  }, [client, refreshState]);

  const getPendingRewards = useCallback(async (address: string): Promise<VaultReward> => {
    if (!client) throw new Error('Client not initialized');
    const rewards = await client.getPendingRewards(address);
    refreshState();
    return rewards;
  }, [client, refreshState]);

  const deposit = useCallback(async (from: string, amount: AmountInput): Promise<VaultTransaction> => {
    if (!client) throw new Error('Client not initialized');
    const tx = await client.deposit(from, amount);
    refreshState();
    return tx;
  }, [client, refreshState]);

  const withdraw = useCallback(async (to: string, amount: AmountInput): Promise<VaultTransaction> => {
    if (!client) throw new Error('Client not initialized');
    const tx = await client.withdraw(to, amount);
    refreshState();
    return tx;
  }, [client, refreshState]);

  const claimRewards = useCallback(async (address: string): Promise<VaultTransaction> => {
    if (!client) throw new Error('Client not initialized');
    const tx = await client.claimRewards(address);
    refreshState();
    return tx;
  }, [client, refreshState]);

  const getTransactionHistory = useCallback((limit?: number): VaultTransaction[] => {
    if (!client) throw new Error('Client not initialized');
    return client.getTransactionHistory(limit);
  }, [client]);

  const updateState = useCallback((updates: Partial<MockVaultState>) => {
    if (!client) throw new Error('Client not initialized');
    client.setState(updates);
    refreshState();
  }, [client, refreshState]);

  // Auto-initialize on mount if enabled
  useEffect(() => {
    if (autoInitialize && !client) {
      initialize();
    }
  }, [autoInitialize, client, initialize]);

  return {
    client,
    isInitializing,
    state,
    error,
    initialize,
    reset,
    getInfo,
    getBalance,
    getPendingRewards,
    deposit,
    withdraw,
    claimRewards,
    getTransactionHistory,
    setState: updateState,
    refreshState
  };
}

/**
 * React hook for using pre-configured dashboard mock scenarios.
 * 
 * This is a convenience hook that provides quick access to common testing scenarios.
 * 
 * @example
 * ```tsx
 * function ActiveVaultDemo() {
 *   const { client, state, deposit } = useDashboardMockScenario('active');
 *   // ...
 * }
 * ```
 */
export function useDashboardMockScenario(
  scenario: 'empty' | 'active' | 'rewards' | 'error',
  contractId?: string
): UseDashboardMockVaultResult {
  const [client, setClient] = useState<DashboardMockVaultClient | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [state, setState] = useState<MockVaultState | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const initialize = useCallback(() => {
    setIsInitializing(true);
    setError(null);
    
    try {
      const newClient = createDashboardMockClientForScenario(scenario, contractId);
      setClient(newClient);
      setState(newClient.getState());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsInitializing(false);
    }
  }, [scenario, contractId]);

  const reset = useCallback(() => {
    if (client) {
      client.reset();
      setState(client.getState());
      setError(null);
    }
  }, [client]);

  const refreshState = useCallback(() => {
    if (client) {
      setState(client.getState());
    }
  }, [client]);

  const getInfo = useCallback(async (): Promise<VaultInfo> => {
    if (!client) throw new Error('Client not initialized');
    return await client.getInfo();
  }, [client]);

  const getBalance = useCallback(async (address: string): Promise<VaultBalance> => {
    if (!client) throw new Error('Client not initialized');
    const balance = await client.getBalance(address);
    refreshState();
    return balance;
  }, [client, refreshState]);

  const getPendingRewards = useCallback(async (address: string): Promise<VaultReward> => {
    if (!client) throw new Error('Client not initialized');
    const rewards = await client.getPendingRewards(address);
    refreshState();
    return rewards;
  }, [client, refreshState]);

  const deposit = useCallback(async (from: string, amount: AmountInput): Promise<VaultTransaction> => {
    if (!client) throw new Error('Client not initialized');
    const tx = await client.deposit(from, amount);
    refreshState();
    return tx;
  }, [client, refreshState]);

  const withdraw = useCallback(async (to: string, amount: AmountInput): Promise<VaultTransaction> => {
    if (!client) throw new Error('Client not initialized');
    const tx = await client.withdraw(to, amount);
    refreshState();
    return tx;
  }, [client, refreshState]);

  const claimRewards = useCallback(async (address: string): Promise<VaultTransaction> => {
    if (!client) throw new Error('Client not initialized');
    const tx = await client.claimRewards(address);
    refreshState();
    return tx;
  }, [client, refreshState]);

  const getTransactionHistory = useCallback((limit?: number): VaultTransaction[] => {
    if (!client) throw new Error('Client not initialized');
    return client.getTransactionHistory(limit);
  }, [client]);

  const updateState = useCallback((updates: Partial<MockVaultState>) => {
    if (!client) throw new Error('Client not initialized');
    client.setState(updates);
    refreshState();
  }, [client, refreshState]);

  // Auto-initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    client,
    isInitializing,
    state,
    error,
    initialize,
    reset,
    getInfo,
    getBalance,
    getPendingRewards,
    deposit,
    withdraw,
    claimRewards,
    getTransactionHistory,
    setState: updateState,
    refreshState
  };
}