import type { ContractInvoker } from '../contracts/vault';
import { VaultContract } from '../contracts/vault';
import type { AmountInput, VaultBalance, VaultInfo, VaultReward, VaultTransaction } from '../types';
import { ValidationError } from '../errors';

/**
 * Mock vault state for dashboard testing and development.
 * Represents the in-memory state of a vault contract.
 */
export interface MockVaultState {
  /** Vault contract information */
  info: VaultInfo;
  /** User balances keyed by address */
  balances: Map<string, bigint>;
  /** Pending rewards keyed by address */
  rewards: Map<string, bigint>;
  /** Transaction history */
  transactions: VaultTransaction[];
  /** Total deposits across all users */
  totalDeposits: bigint;
  /** Current reward pool */
  rewardPool: bigint;
}

/**
 * Configuration options for the dashboard mock vault client.
 */
export interface DashboardMockVaultClientOptions {
  /** Initial vault contract ID */
  contractId: string;
  /** Initial vault information */
  initialInfo?: Partial<VaultInfo>;
  /** Initial user balances (address -> amount) */
  initialBalances?: Record<string, AmountInput>;
  /** Initial user rewards (address -> amount) */
  initialRewards?: Record<string, AmountInput>;
  /** Initial total deposits */
  initialTotalDeposits?: AmountInput;
  /** Initial reward pool */
  initialRewardPool?: AmountInput;
}

/**
 * Dashboard-ready mock vault client for testing and UI development.
 * 
 * This client provides a complete in-memory simulation of vault operations
 * with deterministic behavior, making it ideal for:
 * - Dashboard UI development and testing
 * - Storybook components
 * - Integration testing without live networks
 * - CI/CD pipeline testing
 * 
 * @example
 * ```ts
 * const client = new DashboardMockVaultClient({
 *   contractId: 'CVAULT...',
 *   initialBalances: {
 *     'GUSER...': 1000n,
 *     'GADMIN...': 5000n
 *   }
 * });
 * 
 * // Use like a real vault contract
 * const info = await client.getInfo();
 * const balance = await client.getBalance('GUSER...');
 * await client.deposit('GUSER...', 100n);
 * ```
 */
export class DashboardMockVaultClient {
  readonly contractId: string;
  private readonly state: MockVaultState;
  private readonly transactionCounter = { value: 0 };

  constructor(options: DashboardMockVaultClientOptions) {
    if (!options.contractId || typeof options.contractId !== 'string' || !options.contractId.trim()) {
      throw new ValidationError('contractId is required and must be a non-empty string');
    }

    this.contractId = options.contractId.trim();

    // Initialize mock vault state
    const initialInfo: VaultInfo = {
      contractId: this.contractId,
      assetCode: options.initialInfo?.assetCode || 'XLM',
      totalDeposits: this.normalizeAmount(options.initialTotalDeposits || 0n),
      rewardPool: this.normalizeAmount(options.initialRewardPool || 1000n),
      ...(options.initialInfo?.assetIssuer !== undefined && { assetIssuer: options.initialInfo.assetIssuer }),
      ...options.initialInfo
    };

    const balances = new Map<string, bigint>();
    if (options.initialBalances) {
      for (const [address, amount] of Object.entries(options.initialBalances)) {
        balances.set(address, this.normalizeAmount(amount));
      }
    }

    const rewards = new Map<string, bigint>();
    if (options.initialRewards) {
      for (const [address, amount] of Object.entries(options.initialRewards)) {
        rewards.set(address, this.normalizeAmount(amount));
      }
    }

    this.state = {
      info: initialInfo,
      balances,
      rewards,
      transactions: [],
      totalDeposits: initialInfo.totalDeposits || 0n,
      rewardPool: initialInfo.rewardPool || 1000n
    };
  }

  /**
   * Get vault information.
   * @returns Vault information
   */
  async getInfo(): Promise<VaultInfo> {
    return { ...this.state.info };
  }

  /**
   * Get balance for a specific address.
   * @param address - User address to check balance for
   * @returns User balance
   */
  async getBalance(address: string): Promise<VaultBalance> {
    if (!address || typeof address !== 'string' || !address.trim()) {
      throw new ValidationError('address is required and must be a non-empty string');
    }

    const amount = this.state.balances.get(address.trim()) || 0n;
    return { address: address.trim(), amount };
  }

  /**
   * Get pending rewards for a specific address.
   * @param address - User address to check rewards for
   * @returns User pending rewards
   */
  async getPendingRewards(address: string): Promise<VaultReward> {
    if (!address || typeof address !== 'string' || !address.trim()) {
      throw new ValidationError('address is required and must be a non-empty string');
    }

    const amount = this.state.rewards.get(address.trim()) || 0n;
    return { address: address.trim(), amount };
  }

  /**
   * Deposit funds into the vault.
   * @param from - Address depositing funds
   * @param amount - Amount to deposit
   * @returns Transaction result
   */
  async deposit(from: string, amount: AmountInput): Promise<VaultTransaction> {
    const normalizedAmount = this.normalizeAmount(amount);
    const trimmedFrom = from.trim();

    // Update user balance
    const currentBalance = this.state.balances.get(trimmedFrom) || 0n;
    this.state.balances.set(trimmedFrom, currentBalance + normalizedAmount);

    // Update vault totals
    this.state.totalDeposits += normalizedAmount;
    this.state.info.totalDeposits = this.state.totalDeposits;

    // Simulate transaction
    return this.simulateTransaction('deposit', { from, amount: normalizedAmount });
  }

  /**
   * Withdraw funds from the vault.
   * @param to - Address withdrawing funds
   * @param amount - Amount to withdraw
   * @returns Transaction result
   */
  async withdraw(to: string, amount: AmountInput): Promise<VaultTransaction> {
    const normalizedAmount = this.normalizeAmount(amount);
    const trimmedTo = to.trim();

    const currentBalance = this.state.balances.get(trimmedTo) || 0n;

    if (currentBalance < normalizedAmount) {
      const tx = this.createTransaction('withdraw', 'failed');
      tx.raw = { error: 'Insufficient balance' };
      this.state.transactions.push(tx);
      return tx;
    }

    // Update user balance
    this.state.balances.set(trimmedTo, currentBalance - normalizedAmount);

    // Update vault totals
    this.state.totalDeposits -= normalizedAmount;
    this.state.info.totalDeposits = this.state.totalDeposits;

    // Simulate transaction
    return this.simulateTransaction('withdraw', { to, amount: normalizedAmount });
  }

  /**
   * Claim rewards for an address.
   * @param address - Address claiming rewards
   * @returns Transaction result
   */
  async claimRewards(address: string): Promise<VaultTransaction> {
    const trimmedAddress = address.trim();
    const currentRewards = this.state.rewards.get(trimmedAddress) || 0n;

    if (currentRewards === 0n) {
      const tx = this.createTransaction('claim_rewards', 'failed');
      tx.raw = { error: 'No rewards to claim' };
      this.state.transactions.push(tx);
      return tx;
    }

    // Update user balance with claimed rewards
    const currentBalance = this.state.balances.get(trimmedAddress) || 0n;
    this.state.balances.set(trimmedAddress, currentBalance + currentRewards);

    // Clear rewards and update reward pool
    this.state.rewards.set(trimmedAddress, 0n);
    this.state.rewardPool -= currentRewards;
    this.state.info.rewardPool = this.state.rewardPool;

    // Simulate transaction
    return this.simulateTransaction('claim_rewards', { address, amount: currentRewards });
  }

  /**
   * Get transaction history.
   * @param limit - Maximum number of transactions to return
   * @returns Transaction history
   */
  getTransactionHistory(limit?: number): VaultTransaction[] {
    const history = [...this.state.transactions].reverse();
    if (limit && limit > 0) {
      return history.slice(0, limit);
    }
    return history;
  }

  /**
   * Get current mock state (useful for testing assertions).
   * @returns Current mock vault state
   */
  getState(): MockVaultState {
    return {
      info: { ...this.state.info },
      balances: new Map(this.state.balances),
      rewards: new Map(this.state.rewards),
      transactions: [...this.state.transactions],
      totalDeposits: this.state.totalDeposits,
      rewardPool: this.state.rewardPool
    };
  }

  /**
   * Update mock state directly (useful for testing scenarios).
   * @param updates - Partial state updates
   */
  setState(updates: Partial<MockVaultState>): void {
    if (updates.info) {
      this.state.info = { ...this.state.info, ...updates.info };
    }
    if (updates.balances) {
      for (const [address, amount] of updates.balances.entries()) {
        this.state.balances.set(address, amount);
      }
    }
    if (updates.rewards) {
      for (const [address, amount] of updates.rewards.entries()) {
        this.state.rewards.set(address, amount);
      }
    }
    if (updates.transactions) {
      this.state.transactions = updates.transactions;
    }
    if (updates.totalDeposits !== undefined) {
      this.state.totalDeposits = updates.totalDeposits;
      this.state.info.totalDeposits = updates.totalDeposits;
    }
    if (updates.rewardPool !== undefined) {
      this.state.rewardPool = updates.rewardPool;
      this.state.info.rewardPool = updates.rewardPool;
    }
  }

  /**
   * Reset the mock client to initial state.
   */
  reset(): void {
    this.state.balances.clear();
    this.state.rewards.clear();
    this.state.transactions = [];
    this.transactionCounter.value = 0;
    this.state.totalDeposits = 0n;
    this.state.rewardPool = 1000n;
    this.state.info.totalDeposits = 0n;
    this.state.info.rewardPool = 1000n;
  }

  /**
   * Create a ContractInvoker compatible with VaultContract.
   * This allows using the mock client with existing VaultContract instances.
   * @returns ContractInvoker that routes to this mock client
   */
  asContractInvoker(): ContractInvoker {
    return {
      invoke: async <TResponse = unknown>(request: {
        contractId: string;
        method: string;
        args: readonly unknown[];
      }): Promise<TResponse> => {
        if (request.contractId !== this.contractId) {
          throw new ValidationError(`Contract ID mismatch: expected ${this.contractId}, got ${request.contractId}`);
        }

        switch (request.method) {
          case 'deposit':
            return this.deposit(request.args[0] as string, request.args[1] as AmountInput) as TResponse;
          case 'withdraw':
            return this.withdraw(request.args[0] as string, request.args[1] as AmountInput) as TResponse;
          case 'claim_rewards':
            return this.claimRewards(request.args[0] as string) as TResponse;
          default:
            throw new ValidationError(`Unknown invoke method: ${request.method}`);
        }
      },
      read: async <TResponse = unknown>(request: {
        contractId: string;
        method: string;
        args: readonly unknown[];
      }): Promise<TResponse> => {
        if (request.contractId !== this.contractId) {
          throw new ValidationError(`Contract ID mismatch: expected ${this.contractId}, got ${request.contractId}`);
        }

        switch (request.method) {
          case 'get_info':
            return this.getInfo() as TResponse;
          case 'get_balance':
            return this.getBalance(request.args[0] as string) as TResponse;
          case 'get_pending_rewards':
            return this.getPendingRewards(request.args[0] as string) as TResponse;
          default:
            throw new ValidationError(`Unknown read method: ${request.method}`);
        }
      }
    };
  }

  /**
   * Create a VaultContract instance using this mock client.
   * @returns VaultContract configured with this mock client
   */
  asVaultContract(): VaultContract {
    return new VaultContract({
      contractId: this.contractId,
      invoker: this.asContractInvoker()
    });
  }

  private normalizeAmount(amount: AmountInput): bigint {
    if (typeof amount === 'bigint') return amount;
    if (typeof amount === 'number') return BigInt(amount);
    return BigInt(amount);
  }

  private createTransaction(method: string, status: 'success' | 'failed' | 'pending'): VaultTransaction {
    this.transactionCounter.value += 1;
    return {
      hash: `tx_${method}_${this.transactionCounter.value}`,
      status,
      raw: { method, timestamp: new Date().toISOString() }
    };
  }

  private simulateTransaction(method: string, metadata: Record<string, unknown>): VaultTransaction {
    const tx = this.createTransaction(method, 'success');
    tx.raw = { ...metadata, timestamp: new Date().toISOString() };
    this.state.transactions.push(tx);
    return tx;
  }
}

/**
 * Factory function to create a pre-configured dashboard mock vault client.
 * 
 * @param options - Configuration options
 * @returns Configured DashboardMockVaultClient instance
 * 
 * @example
 * ```ts
 * const client = createDashboardMockVaultClient({
 *   contractId: 'CVAULT...',
 *   initialBalances: { 'GUSER...': 1000n }
 * });
 * ```
 */
export function createDashboardMockVaultClient(
  options: DashboardMockVaultClientOptions
): DashboardMockVaultClient {
  return new DashboardMockVaultClient(options);
}

/**
 * Create a dashboard mock client with common test scenarios.
 * 
 * @param scenario - Pre-configured scenario name
 * @param contractId - Vault contract ID
 * @returns Configured DashboardMockVaultClient instance
 */
export function createDashboardMockClientForScenario(
  scenario: 'empty' | 'active' | 'rewards' | 'error',
  contractId: string = 'CVAULT_MOCK_CONTRACT_ID'
): DashboardMockVaultClient {
  switch (scenario) {
    case 'empty':
      return new DashboardMockVaultClient({
        contractId,
        initialBalances: {},
        initialRewards: {},
        initialTotalDeposits: 0n,
        initialRewardPool: 1000n
      });

    case 'active':
      return new DashboardMockVaultClient({
        contractId,
        initialBalances: {
          'GACTIVE_USER1': 1000n,
          'GACTIVE_USER2': 2500n,
          'GACTIVE_USER3': 500n
        },
        initialRewards: {
          'GACTIVE_USER1': 50n,
          'GACTIVE_USER2': 125n
        },
        initialTotalDeposits: 4000n,
        initialRewardPool: 500n
      });

    case 'rewards':
      return new DashboardMockVaultClient({
        contractId,
        initialBalances: {
          'GREWARD_USER': 500n
        },
        initialRewards: {
          'GREWARD_USER': 200n
        },
        initialTotalDeposits: 500n,
        initialRewardPool: 800n
      });

    case 'error':
      return new DashboardMockVaultClient({
        contractId,
        initialBalances: {
          'GERROR_USER': 100n
        },
        initialRewards: {},
        initialTotalDeposits: 100n,
        initialRewardPool: 0n
      });

    default:
      throw new ValidationError(`Unknown scenario: ${scenario}`);
  }
}