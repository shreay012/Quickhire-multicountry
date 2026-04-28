import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { paymentService } from '@/lib/services/paymentApi';

// Async thunk for fetching payment history
export const fetchPaymentHistory = createAsyncThunk(
  'payment/fetchPaymentHistory',
  async ({ page, limit }, { rejectWithValue }) => {
    try {
      const response = await paymentService.getPaymentHistory({ page, limit });
      return response.data?.data !== undefined ? response.data.data : response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment history');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState: {
    history: [],
    loading: false,
    error: null,
    totalPages: 1,
    currentPage: 1,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history = Array.isArray(action.payload) ? action.payload : (action.payload?.data || []);
        state.totalPages = action.payload?.totalPages || 1;
        state.currentPage = action.payload?.currentPage || 1;
      })
      .addCase(fetchPaymentHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default paymentSlice.reducer;
