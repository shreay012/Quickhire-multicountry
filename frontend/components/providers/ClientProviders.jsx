'use client';

import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LegalAcceptanceProvider } from './LegalAcceptanceProvider';

/**
 * Client-only providers wrapper.
 * Keeps layout.jsx (server component) free of client imports.
 *
 * Provider order (inner-most first):
 *   ErrorBoundary → LegalAcceptanceProvider → children
 */
export default function ClientProviders({ children }) {
  return (
    <ErrorBoundary>
      <LegalAcceptanceProvider>
        {children}
      </LegalAcceptanceProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'inherit', borderRadius: '12px', fontSize: '14px' },
          success: { iconTheme: { primary: '#45A735', secondary: '#fff' } },
        }}
      />
    </ErrorBoundary>
  );
}
