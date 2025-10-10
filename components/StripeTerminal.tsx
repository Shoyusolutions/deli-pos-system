'use client';

import { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    StripeTerminal: any;
  }
}

interface StripeTerminalProps {
  onPaymentSuccess: (paymentIntent: any) => void;
  onPaymentError: (error: string) => void;
  amount: number;
  storeId: string;
}

export default function StripeTerminal({
  onPaymentSuccess,
  onPaymentError,
  amount,
  storeId
}: StripeTerminalProps) {
  const [terminal, setTerminal] = useState<any>(null);
  const [reader, setReader] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const terminalRef = useRef<any>(null);

  useEffect(() => {
    initializeTerminal();
    return () => {
      if (terminalRef.current) {
        terminalRef.current.clearCachedCredentials();
      }
    };
  }, []);

  const initializeTerminal = async () => {
    try {
      if (!window.StripeTerminal) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/terminal/v1/';
        script.onload = () => setupTerminal();
        document.head.appendChild(script);
      } else {
        setupTerminal();
      }
    } catch (error) {
      console.error('Failed to initialize Stripe Terminal:', error);
      setStatus('Failed to initialize');
    }
  };

  const setupTerminal = async () => {
    try {
      const terminal = window.StripeTerminal.create({
        onFetchConnectionToken: async () => {
          const response = await fetch('/api/stripe/terminal/connection-token', {
            method: 'POST',
          });
          const { secret } = await response.json();
          return secret;
        },
        onUnexpectedReaderDisconnect: () => {
          setReader(null);
          setStatus('Reader disconnected');
        },
      });

      terminalRef.current = terminal;
      setTerminal(terminal);
      setStatus('Ready to connect reader');
    } catch (error) {
      console.error('Terminal setup error:', error);
      setStatus('Setup failed');
    }
  };

  const discoverReaders = async () => {
    if (!terminal) return;

    setIsConnecting(true);
    setStatus('Searching for readers...');

    try {
      console.log('Starting reader discovery...');
      const { discoveredReaders } = await terminal.discoverReaders({
        simulated: false,
      });

      console.log(`Found ${discoveredReaders.length} readers:`, discoveredReaders);

      if (discoveredReaders.length === 0) {
        setStatus('No readers found. Make sure M2 is registered to this location and powered on.');
        setIsConnecting(false);
        return;
      }

      // Show all available readers
      const readerInfo = discoveredReaders.map((r: any) => `${r.label || 'Unknown'} (${r.serial_number || 'No Serial'})`).join(', ');
      setStatus(`Found readers: ${readerInfo}. Connecting to first...`);

      const reader = discoveredReaders[0];
      await connectToReader(reader);
    } catch (error: any) {
      console.error('Reader discovery error:', error);
      setStatus(`Discovery failed: ${error.message || 'Unknown error'}`);
      setIsConnecting(false);
    }
  };

  const connectToReader = async (reader: any) => {
    if (!terminal) return;

    try {
      setStatus(`Connecting to ${reader.label || reader.serial_number}...`);
      console.log('Connecting to reader:', reader);
      console.log('Location ID:', process.env.NEXT_PUBLIC_STRIPE_LOCATION_ID);

      const { reader: connectedReader } = await terminal.connectBluetoothReader(
        reader,
        { location_id: process.env.NEXT_PUBLIC_STRIPE_LOCATION_ID }
      );

      setReader(connectedReader);
      setStatus(`Connected to ${connectedReader.label || connectedReader.serial_number}`);
      setIsConnecting(false);
      console.log('Successfully connected to reader:', connectedReader);
    } catch (error: any) {
      console.error('Reader connection error:', error);
      setStatus(`Connection failed: ${error.message || 'Unknown error'}`);
      setIsConnecting(false);
    }
  };

  const processPayment = async () => {
    if (!terminal || !reader) {
      onPaymentError('Reader not connected');
      return;
    }

    setIsProcessing(true);
    setStatus('Creating payment...');

    try {
      const response = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          storeId,
          metadata: {
            source: 'pos_terminal'
          }
        }),
      });

      const { client_secret } = await response.json();

      setStatus('Present card to reader...');

      const { paymentIntent } = await terminal.collectPaymentMethod(client_secret);

      setStatus('Processing payment...');

      const { paymentIntent: confirmedPaymentIntent } = await terminal.confirmPaymentIntent(paymentIntent);

      if (confirmedPaymentIntent.status === 'succeeded') {
        setStatus('Payment successful!');
        onPaymentSuccess(confirmedPaymentIntent);
      } else {
        throw new Error('Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      onPaymentError(error.message || 'Payment failed');
      setStatus('Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Card Reader</h3>

      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">Status:</div>
        <div className="text-sm font-medium">{status}</div>
      </div>

      {!reader && !isConnecting && (
        <button
          onClick={discoverReaders}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Connect M2 Reader
        </button>
      )}

      {reader && !isProcessing && (
        <div className="space-y-2">
          <div className="text-sm text-green-600">
            ✓ Connected to {reader.label}
          </div>
          <button
            onClick={processPayment}
            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            Process Card Payment (${amount.toFixed(2)})
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Processing...</div>
        </div>
      )}
    </div>
  );
}