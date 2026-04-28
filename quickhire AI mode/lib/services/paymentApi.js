import axios from '../axios/axiosInstance';
import { ENDPOINTS } from '../endpoints';

export const paymentService = {
  // Create Razorpay order
  createOrder: async (jobId, amount) => {
    return await axios.post(ENDPOINTS.PAYMENT.CREATE_ORDER, {
      jobId,
      amount
    });
  },

  // Verify payment
  verifyPayment: async (paymentData) => {
    return await axios.post(ENDPOINTS.PAYMENT.VERIFY, paymentData);
  },

  // Get payment status
  getPaymentStatus: async (paymentId) => {
    return await axios.get(ENDPOINTS.PAYMENT.STATUS(paymentId));
  },

  // Get payment history
  getPaymentHistory: async ({ page = 1, limit = 10 }) => {
    return await axios.get(`${ENDPOINTS.PAYMENT.HISTORY}?page=${page}&limit=${limit}`);
  },

  // Download invoice
  downloadInvoice: async (jobId) => {
    return await axios.post(ENDPOINTS.PAYMENT.DOWNLOAD_INVOICE(jobId), {}, {
      responseType: 'blob'
    });
  },
};
