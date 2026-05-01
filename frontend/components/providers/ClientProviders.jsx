'use client';

import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LegalAcceptanceProvider } from './LegalAcceptanceProvider';
import { ToastProvider } from './ToastProvider';
import { SocketProvider } from './SocketProvider';

/**
 * Client-only providers wrapper.
 * Keeps layout.jsx (server component) free of client imports.
 *
 * Provider order (outer-most first):
 *   ErrorBoundary → ToastProvider → SocketProvider → LegalAcceptanceProvider
 *
 * ToastProvider must wrap SocketProvider because SocketProvider's
 * notification handler calls useToast(). SocketProvider sits at root so
 * realtime notifications + sound work across every page (customer,
 * /admin, /pm, /resource, /staff-login).
 */
export default function ClientProviders({ children }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <SocketProvider>
          <LegalAcceptanceProvider>
            {children}
          </LegalAcceptanceProvider>
        </SocketProvider>
      </ToastProvider>
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
