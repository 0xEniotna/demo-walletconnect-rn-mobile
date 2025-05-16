import 'react-native-get-random-values';
import 'fast-text-encoding';
import '@walletconnect/react-native-compat';
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Button,
  Linking,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import UniversalProvider from '@walletconnect/universal-provider';
import { SessionTypes } from '@walletconnect/types';

// Define metadata globally
const metadata = {
  name: 'Wallet connect Test',
  description: 'Test app for connecting to Argent Mobile',
  url: 'https://walletconnect.com/',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

const initializeProvider = async () => {
  try {
    console.log('Initializing provider...');

    const projectId = ''; // walletconnect project id

    const providerInstance = await UniversalProvider.init({
      projectId,
      metadata,
      relayUrl: 'wss://relay.walletconnect.com',
    });

    console.log('Provider initialized successfully');
    return providerInstance;
  } catch (err: any) {
    console.error('Error initializing provider:', err);
    throw err;
  }
};

// Define a type for the UniversalProvider instance
type ProviderInstance = Awaited<ReturnType<typeof initializeProvider>>;

// Define types for Starknet responses
interface StarknetTransactionResponse {
  transaction_hash: string;
}

// Example ETH transfer transaction
const createEthTransferTransaction = (accountAddress: string) => ({
  accountAddress,
  executionRequest: {
    calls: [
      {
        contractAddress:
          '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH contract address on Starknet
        entrypoint: 'transfer',
        calldata: [
          accountAddress, // recipient (sending to self)
          '0x0000000000000000000000000000000000000000000000000000000000000001', // amount 1 wei
          '0x0',
        ],
      },
    ],
  },
});

const newCalldata = [
  {
    to: '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
    selector:
      '0x219209e083275171774dab1df80982e9df2096516f06319c5c6d71ae0a8480c',
    calldata: [
      '0x44aa20c51f815974487cbe06ae547a16690d4ca7f8c703aa8bbffe6d7393d46',
      '0x56bc75e2d63100000',
      '0x0',
    ],
  },
  {
    to: '0x44aa20c51f815974487cbe06ae547a16690d4ca7f8c703aa8bbffe6d7393d46',
    selector: '0xd5c0f26335ab142eb700850eded4619418b0f6e98c5b92a6347b68d2f2a0c',
    calldata: [
      '0x2d09ca739a6d3a5bed6ae8a3190db0966d57f4c4fff34e19738990596879904',
      '0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      '0x56bc75e2d63100000',
      '0x0',
      '0x2a4c56a99f93d0b19f9a3b09640cb9fd1f4c426474a85dedfec573849ab6235',
    ],
  },
];

export default function App() {
  const [provider, setProvider] = useState<ProviderInstance | null>(null);
  const [session, setSession] = useState<SessionTypes.Struct | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [wcUri, setWcUri] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'MAINNET' | 'SEPOLIA'>(
    'SEPOLIA'
  );

  // Add useEffect for Linking event listener
  useEffect(() => {
    // Handle initial URL (if app was opened via a deep link)
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
    };
    getUrlAsync();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Subsequent URL received:', url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Set up provider on mount
  useEffect(() => {
    initializeProvider()
      .then((prov) => {
        console.log('Provider initialized successfully');
        setProvider(prov);

        // Check if we already have an active session
        const activeSessions = Object.values(prov.session || {});
        if (activeSessions.length > 0) {
          console.log('Found active session:', activeSessions[0]);
          setSession(activeSessions[0] as SessionTypes.Struct);

          // Extract account if available
          const starknetAccounts =
            activeSessions[0]?.namespaces?.starknet?.accounts;
          if (starknetAccounts && starknetAccounts.length > 0) {
            const accountAddress = starknetAccounts[0].split(':')[2];
            setAccount(accountAddress);
          }
        }
      })
      .catch((err: any) => {
        console.error('Provider initialization failed:', err);
        setError('Setup failed: ' + (err?.message || 'Unknown error'));
      });
  }, []);

  const openWallet = async (uri: string) => {
    const encodedUri = encodeURIComponent(uri);

    const argentScheme = `argent-dev://wc?uri=${encodedUri}`;
    console.log('Opening Argent with scheme:', argentScheme);

    try {
      await Linking.openURL(argentScheme);
      console.log('Successfully opened Argent');
    } catch (err) {
      console.error('Failed to open Argent:', err);
      setError(
        'Failed to open Argent wallet. Please make sure it is installed.'
      );
    }
  };

  // Connect to Argent Mobile
  const handleConnect = async () => {
    if (!provider) {
      console.error('Provider is not initialized');
      setError('Provider is not initialized');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setWcUri(null);

    try {
      console.log('Attempting to connect...');
      console.log(`Using Argent Mobile chain ID: starknet:SNSEPOLIA`);

      const { uri, approval } = await provider.client.connect({
        requiredNamespaces: {
          starknet: {
            chains: ['starknet:SNSEPOLIA'], // Use Argent specific chain ID format
            methods: [
              'starknet_account',
              'starknet_requestAddInvokeTransaction',
            ],
            events: ['accountsChanged', 'chainChanged'],
          },
        },
        sessionProperties: {
          url: 'starknetrntest://wc',
          name: metadata.name,
          description: metadata.description,
          icons: metadata.icons[0],
        },
      });

      // Store the URI for deep linking
      if (uri) {
        console.log('WalletConnect URI:', uri);
        setWcUri(uri);
        openWallet(uri);
      } else {
        console.warn('No URI available for wallet connection');
        setIsConnecting(false);
        return;
      }

      // Wait for wallet approval
      console.log('Waiting for wallet approval...');
      const session = await approval();
      console.log('Session approved:', session);

      if (session && session.namespaces.starknet?.accounts?.length > 0) {
        const accountAddress =
          session.namespaces.starknet.accounts[0].split(':')[2]; // Extract address
        console.log('Connected to account:', accountAddress);
        setSession(session);
        setAccount(accountAddress);
      } else {
        console.warn('Session established but no accounts found');
        if (session) {
          console.log(
            'Session namespaces:',
            JSON.stringify(session.namespaces)
          );
        }
      }
    } catch (err: any) {
      console.error('Connection error:', err);
      setError('Connection failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from  Mobile
  const handleDisconnect = async () => {
    if (!provider || !session) {
      console.error(
        'Cannot disconnect: Provider or session is not initialized'
      );
      return;
    }
    try {
      console.log('Disconnecting session...');
      await provider.disconnect();
      console.log('Successfully disconnected');
      setSession(null);
      setAccount(null);
      setWcUri(null);
      setTransactionHash(null);
    } catch (err: any) {
      console.error('Disconnect error:', err);
      setError('Disconnect failed: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleCalldata = async () => {
    if (!provider || !account || !session) {
      setError('Provider or account not initialized');
      return;
    }

    try {
      setError(null);
      console.log('Requesting transaction with custom calldata...');
      console.log('Custom calldata:', JSON.stringify(newCalldata, null, 2));

      const argentScheme = `argent-dev://`;
      try {
        await Linking.openURL(argentScheme);
        console.log('Opened Argent app before transaction');
      } catch (err) {
        console.warn('Could not open Argent app:', err);
      }

      // Wait a moment for the app to open
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Use the client property of the provider to make the request
      const result = await provider.client.request<StarknetTransactionResponse>(
        {
          topic: session.topic,
          chainId: 'starknet:SNSEPOLIA',
          request: {
            method: 'starknet_requestAddInvokeTransaction',
            params: {
              accountAddress: account,
              executionRequest: {
                calls: newCalldata.map((call) => ({
                  contractAddress: call.to,
                  entrypoint: call.selector,
                  calldata: call.calldata,
                })),
              },
            },
          },
        }
      );

      console.log('Custom calldata transaction result:', result);
      if (result && result.transaction_hash) {
        setTransactionHash(result.transaction_hash);
      }
    } catch (err: any) {
      console.error('Error requesting custom calldata transaction:', err);
      setError(
        'Custom calldata transaction failed: ' +
          (err?.message || 'Unknown error')
      );
    }
  };

  const handleEthTransfer = async () => {
    if (!provider || !account || !session) {
      setError('Provider or account not initialized');
      return;
    }

    try {
      setError(null);
      console.log('Requesting ETH transfer transaction...');

      const transaction = createEthTransferTransaction(account);
      console.log('ETH transfer params:', JSON.stringify(transaction, null, 2));

      const argentScheme = `argent-dev://`;
      try {
        await Linking.openURL(argentScheme);
        console.log('Opened Argent app before transaction');
      } catch (err) {
        console.warn('Could not open Argent app:', err);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await provider.client.request<StarknetTransactionResponse>(
        {
          topic: session.topic,
          chainId: 'starknet:SNSEPOLIA',
          request: {
            method: 'starknet_requestAddInvokeTransaction',
            params: {
              accountAddress: transaction.accountAddress,
              executionRequest: transaction.executionRequest,
            },
          },
        }
      );

      console.log('ETH transfer result:', result);
      if (result && result.transaction_hash) {
        setTransactionHash(result.transaction_hash);
      }
    } catch (err: any) {
      console.error('Error requesting ETH transfer:', err);
      setError('ETH transfer failed: ' + (err?.message || 'Unknown error'));
    } finally {
      // Clear the flag when done
      handleEthTransfer.isProcessing = false;
    }
  };

  // Add the property to the function
  handleEthTransfer.isProcessing = false;

  // Cancel connection attempt
  const handleCancelConnect = () => {
    if (isConnecting) {
      setIsConnecting(false);
      setWcUri(null);
      console.log('Connection attempt cancelled');
    }
  };

  if (!provider) {
    return (
      <View style={styles.container}>
        <Text>Loading provider...</Text>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Starknet Wallet Test</Text>

        {!session && (
          <View style={styles.networkSelector}>
            <Text style={styles.networkLabel}>Network:</Text>
            <Text
              style={[
                styles.networkButton,
                selectedNetwork === 'SEPOLIA' && styles.selectedNetwork,
              ]}
              onPress={() => setSelectedNetwork('SEPOLIA')}
            >
              <Text style={styles.networkButtonText}>SEPOLIA</Text>
            </Text>
          </View>
        )}

        {session ? (
          <>
            <Text style={styles.connectedText}>Connected to Argent</Text>
            <Text style={styles.networkText}>Network: SEPOLIA</Text>
            <Text style={styles.accountText}>Account: {account}</Text>

            <View style={styles.buttonContainer}>
              <Button title="Send calldata" onPress={handleCalldata} />
            </View>

            <View style={styles.buttonContainer}>
              <Button
                title="Transfer ETH to Self"
                onPress={handleEthTransfer}
              />
            </View>

            {transactionHash && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultTitle}>Transaction Hash:</Text>
                <Text style={styles.resultText}>{transactionHash}</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <Button
                title="Disconnect"
                onPress={handleDisconnect}
                color="red"
              />
            </View>
          </>
        ) : (
          <>
            <Button
              title={isConnecting ? 'Connecting...' : 'Connect with Argent'}
              onPress={handleConnect}
              disabled={isConnecting}
            />
            {isConnecting && (
              <Button
                title="Cancel"
                onPress={handleCancelConnect}
                color="red"
              />
            )}
          </>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
        <StatusBar style="auto" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  networkSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  networkLabel: {
    marginRight: 10,
  },
  networkButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  selectedNetwork: {
    backgroundColor: '#2196F3',
  },
  networkButtonText: {
    fontWeight: '500',
  },
  networkText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  connectedText: {
    fontSize: 18,
    marginBottom: 10,
    color: 'green',
  },
  accountText: {
    fontSize: 14,
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    marginVertical: 10,
    width: '100%',
    maxWidth: 300,
  },
  resultContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    width: '100%',
    maxWidth: 300,
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#333',
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});
