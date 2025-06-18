import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth/authSlice';
import bookingReducer from './features/bookings/bookingSlice';
import studioReducer from './features/studios/studioSlice';
import equipmentReducer from './features/equipment/equipmentSlice';
import staffReducer from './features/staff/staffSlice';
import clientReducer from './features/clients/clientSlice';
import paymentReducer from './features/payments/paymentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bookings: bookingReducer,
    studios: studioReducer,
    equipment: equipmentReducer,
    staff: staffReducer,
    clients: clientReducer,
    payments: paymentReducer,
  },
});
