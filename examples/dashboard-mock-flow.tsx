/**
 * Example: Dashboard Mock Vault Flow
 * 
 * This example demonstrates how to use the dashboard mock vault client
 * for building and testing dashboard UIs without requiring live network connections.
 * 
 * The mock system provides deterministic vault operations with in-memory state,
 * making it ideal for:
 * - Dashboard UI development and testing
 * - Storybook components
 * - Integration testing without live networks
 * - CI/CD pipeline testing
 */

import React, { useState } from 'react';
import {
  DashboardMockVaultClient,
  createDashboardMockVaultClient,
  createDashboardMockClientForScenario
} from '../packages/core/src/testing';

const CONTRACT_ID = 'CVAULT_DEMO_CONTRACT_ID';
const USER_ADDRESS = 'GDEMO_USER_ADDRESS';
const ADMIN_ADDRESS = 'GDEMO_ADMIN_ADDRESS';

// Example 1: Basic Dashboard Component
function BasicVaultDashboard() {
  const [client] = useState(() => 
    createDashboardMockVaultClient({
      contractId: CONTRACT_ID,
      initialBalances: {
        [USER_ADDRESS]: 1000n,
        [ADMIN_ADDRESS]: 5000n
      },
      initialRewards: {
        [USER_ADDRESS]: 50n
      },
      initialTotalDeposits: 6000n,
      initialRewardPool: 1000n
    })
  );

  const [vaultInfo, setVaultInfo] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<any>(null);
  const [pendingRewards, setPendingRewards] = useState<any>(null);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVaultData = async () => {
    setLoading(true);
    try {
      const [info, balance, rewards, history] = await Promise.all([
        client.getInfo(),
        client.getBalance(USER_ADDRESS),
        client.getPendingRewards(USER_ADDRESS),
        Promise.resolve(client.getTransactionHistory(5))
      ]);
      
      setVaultInfo(info);
      setUserBalance(balance);
      setPendingRewards(rewards);
      setTransactionHistory(history);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    setLoading(true);
    try {
      await client.deposit(USER_ADDRESS, 100n);
      await loadVaultData();
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      await client.withdraw(USER_ADDRESS, 50n);
      await loadVaultData();
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    setLoading(true);
    try {
      await client.claimRewards(USER_ADDRESS);
      await loadVaultData();
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadVaultData();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Basic Vault Dashboard</h2>
      
      {loading && <p>Loading...</p>}
      
      {vaultInfo && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Vault Information</h3>
          <p>Contract ID: {vaultInfo.contractId}</p>
          <p>Asset Code: {vaultInfo.assetCode}</p>
          <p>Total Deposits: {vaultInfo.totalDeposits?.toString()}</p>
          <p>Reward Pool: {vaultInfo.rewardPool?.toString()}</p>
        </div>
      )}

      {userBalance && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Your Balance</h3>
          <p>Address: {userBalance.address}</p>
          <p>Balance: {userBalance.amount.toString()}</p>
        </div>
      )}

      {pendingRewards && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Pending Rewards</h3>
          <p>Rewards: {pendingRewards.amount.toString()}</p>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Actions</h3>
        <button 
          onClick={handleDeposit} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Deposit 100
        </button>
        <button 
          onClick={handleWithdraw} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Withdraw 50
        </button>
        <button 
          onClick={handleClaimRewards} 
          disabled={loading}
          style={{ padding: '8px 16px' }}
        >
          Claim Rewards
        </button>
      </div>

      {transactionHistory.length > 0 && (
        <div>
          <h3>Recent Transactions</h3>
          <ul>
            {transactionHistory.map((tx, index) => (
              <li key={index}>
                {tx.hash} - {tx.status} 
                {tx.raw && typeof tx.raw === 'object' && 'timestamp' in tx.raw && 
                  ` (${new Date(tx.raw.timestamp as string).toLocaleTimeString()})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Example 2: Using Pre-configured Scenarios
function ScenarioDashboard() {
  const [scenario, setScenario] = useState<'empty' | 'active' | 'rewards' | 'error'>('active');
  const [client, setClient] = useState<DashboardMockVaultClient | null>(null);
  const [state, setState] = useState<any>(null);

  React.useEffect(() => {
    const newClient = createDashboardMockClientForScenario(scenario, CONTRACT_ID);
    setClient(newClient);
    setState(newClient.getState());
  }, [scenario]);

  const refreshState = () => {
    if (client) {
      setState(client.getState());
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Scenario Dashboard</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Select Scenario: </label>
        <select 
          value={scenario} 
          onChange={(e) => setScenario(e.target.value as any)}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="empty">Empty Vault</option>
          <option value="active">Active Vault</option>
          <option value="rewards">Rewards Vault</option>
          <option value="error">Error Scenario</option>
        </select>
      </div>

      {state && (
        <div>
          <h3>Current State</h3>
          <p>Total Users: {state.balances.size}</p>
          <p>Total Deposits: {state.totalDeposits.toString()}</p>
          <p>Reward Pool: {state.rewardPool.toString()}</p>
          <p>Transaction Count: {state.transactions.length}</p>
          
          <div style={{ marginTop: '20px' }}>
            <h4>User Balances</h4>
            <ul>
              {Array.from(state.balances.entries()).map(([address, amount]) => (
                <li key={address}>{address}: {amount.toString()}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4>Pending Rewards</h4>
            <ul>
              {Array.from(state.rewards.entries()).map(([address, amount]) => (
                <li key={address}>{address}: {amount.toString()}</li>
              ))}
            </ul>
          </div>

          <button 
            onClick={refreshState}
            style={{ marginTop: '20px', padding: '8px 16px' }}
          >
            Refresh State
          </button>
        </div>
      )}
    </div>
  );
}

// Example 3: Multi-User Dashboard
function MultiUserDashboard() {
  const [client] = useState(() =>
    createDashboardMockVaultClient({
      contractId: CONTRACT_ID,
      initialBalances: {
        'GUSER1': 1000n,
        'GUSER2': 2500n,
        'GUSER3': 500n,
        'GUSER4': 1500n
      },
      initialRewards: {
        'GUSER1': 25n,
        'GUSER2': 75n,
        'GUSER3': 10n
      }
    })
  );

  const [selectedUser, setSelectedUser] = useState('GUSER1');
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadUserData = async (address: string) => {
    setLoading(true);
    try {
      const [balance, rewards] = await Promise.all([
        client.getBalance(address),
        client.getPendingRewards(address)
      ]);
      setUserData({ address, balance, rewards });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadUserData(selectedUser);
  }, [selectedUser]);

  const handleDeposit = async () => {
    setLoading(true);
    try {
      await client.deposit(selectedUser, 100n);
      await loadUserData(selectedUser);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      await client.withdraw(selectedUser, 50n);
      await loadUserData(selectedUser);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    setLoading(true);
    try {
      await client.claimRewards(selectedUser);
      await loadUserData(selectedUser);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Multi-User Dashboard</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Select User: </label>
        <select 
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="GUSER1">User 1</option>
          <option value="GUSER2">User 2</option>
          <option value="GUSER3">User 3</option>
          <option value="GUSER4">User 4</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}

      {userData && (
        <div>
          <h3>User: {userData.address}</h3>
          <p>Balance: {userData.balance.amount.toString()}</p>
          <p>Pending Rewards: {userData.rewards.amount.toString()}</p>
          
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={handleDeposit}
              disabled={loading}
              style={{ marginRight: '10px', padding: '8px 16px' }}
            >
              Deposit 100
            </button>
            <button 
              onClick={handleWithdraw}
              disabled={loading}
              style={{ marginRight: '10px', padding: '8px 16px' }}
            >
              Withdraw 50
            </button>
            <button 
              onClick={handleClaimRewards}
              disabled={loading}
              style={{ padding: '8px 16px' }}
            >
              Claim Rewards
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <h3>Vault Overview</h3>
        {(() => {
          const state = client.getState();
          return (
            <div>
              <p>Total Users: {state.balances.size}</p>
              <p>Total Deposits: {state.totalDeposits.toString()}</p>
              <p>Reward Pool: {state.rewardPool.toString()}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// Example 4: Transaction History Explorer
function TransactionHistoryExplorer() {
  const [client] = useState(() =>
    createDashboardMockVaultClient({
      contractId: CONTRACT_ID,
      initialBalances: { [USER_ADDRESS]: 1000n }
    })
  );

  const [transactions, setTransactions] = useState<any[]>([]);
  const [limit, setLimit] = useState(10);

  const refreshHistory = () => {
    setTransactions(client.getTransactionHistory(limit));
  };

  const generateTransactions = async () => {
    await client.deposit(USER_ADDRESS, 100n);
    await client.deposit(USER_ADDRESS, 200n);
    await client.withdraw(USER_ADDRESS, 50n);
    await client.claimRewards(USER_ADDRESS);
    refreshHistory();
  };

  React.useEffect(() => {
    refreshHistory();
  }, [limit]);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Transaction History Explorer</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Show Last: </label>
        <input 
          type="number" 
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          min="1"
          max="100"
          style={{ marginLeft: '10px', padding: '5px', width: '60px' }}
        />
        <span style={{ marginLeft: '10px' }}>transactions</span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={generateTransactions}
          style={{ padding: '8px 16px' }}
        >
          Generate Sample Transactions
        </button>
        <button 
          onClick={refreshHistory}
          style={{ marginLeft: '10px', padding: '8px 16px' }}
        >
          Refresh
        </button>
      </div>

      <div>
        <h3>Transaction History ({transactions.length})</h3>
        {transactions.length === 0 ? (
          <p>No transactions yet</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Hash</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Timestamp</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px' }}>{tx.hash}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: tx.status === 'success' ? '#d4edda' : '#f8d7da',
                      color: tx.status === 'success' ? '#155724' : '#721c24'
                    }}>
                      {tx.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>
                    {tx.raw && typeof tx.raw === 'object' && 'timestamp' in tx.raw 
                      ? new Date(tx.raw.timestamp as string).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {tx.raw && typeof tx.raw === 'object' && (
                      <pre style={{ margin: 0, fontSize: '12px' }}>
                        {JSON.stringify(tx.raw, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Example 5: State Manipulation Dashboard
function StateManipulationDashboard() {
  const [client] = useState(() =>
    createDashboardMockVaultClient({
      contractId: CONTRACT_ID,
      initialBalances: { [USER_ADDRESS]: 1000n }
    })
  );

  const [state, setState] = useState<any>(null);

  const refreshState = () => {
    setState(client.getState());
  };

  const addBalance = () => {
    const currentState = client.getState();
    const newBalances = new Map(currentState.balances);
    newBalances.set('GNEW_USER', 500n);
    client.setState({ balances: newBalances });
    refreshState();
  };

  const addRewards = () => {
    const currentState = client.getState();
    const newRewards = new Map(currentState.rewards);
    newRewards.set('GNEW_USER', 25n);
    client.setState({ rewards: newRewards });
    refreshState();
  };

  const updateTotals = () => {
    client.setState({
      totalDeposits: 10000n,
      rewardPool: 5000n
    });
    refreshState();
  };

  const resetClient = () => {
    client.reset();
    refreshState();
  };

  React.useEffect(() => {
    refreshState();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>State Manipulation Dashboard</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={addBalance} style={{ marginRight: '10px', padding: '8px 16px' }}>
          Add User Balance
        </button>
        <button onClick={addRewards} style={{ marginRight: '10px', padding: '8px 16px' }}>
          Add User Rewards
        </button>
        <button onClick={updateTotals} style={{ marginRight: '10px', padding: '8px 16px' }}>
          Update Totals
        </button>
        <button onClick={resetClient} style={{ padding: '8px 16px' }}>
          Reset Client
        </button>
      </div>

      {state && (
        <div>
          <h3>Current State</h3>
          <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify({
                info: state.info,
                totalDeposits: state.totalDeposits.toString(),
                rewardPool: state.rewardPool.toString(),
                userCount: state.balances.size,
                balances: Object.fromEntries(state.balances),
                rewards: Object.fromEntries(state.rewards),
                transactionCount: state.transactions.length
              }, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Main example component
export function DashboardMockFlowExamples() {
  const [activeExample, setActiveExample] = useState<string>('basic');

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard Mock Vault Flow Examples</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Select Example: </label>
        <select 
          value={activeExample}
          onChange={(e) => setActiveExample(e.target.value)}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="basic">Basic Dashboard</option>
          <option value="scenario">Scenario Dashboard</option>
          <option value="multiuser">Multi-User Dashboard</option>
          <option value="history">Transaction History</option>
          <option value="state">State Manipulation</option>
        </select>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: '5px', padding: '20px' }}>
        {activeExample === 'basic' && <BasicVaultDashboard />}
        {activeExample === 'scenario' && <ScenarioDashboard />}
        {activeExample === 'multiuser' && <MultiUserDashboard />}
        {activeExample === 'history' && <TransactionHistoryExplorer />}
        {activeExample === 'state' && <StateManipulationDashboard />}
      </div>
    </div>
  );
}

export {
  BasicVaultDashboard,
  ScenarioDashboard,
  MultiUserDashboard,
  TransactionHistoryExplorer,
  StateManipulationDashboard
};