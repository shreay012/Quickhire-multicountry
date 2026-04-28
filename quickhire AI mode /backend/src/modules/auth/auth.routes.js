import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import { sendOtpSchema, verifyOtpSchema, refreshSchema } from './auth.validators.js';
import * as ctrl from './auth.controller.js';

const r = Router();
r.post('/send-otp', validate(sendOtpSchema), ctrl.sendOtp);
r.post('/verify-otp', validate(verifyOtpSchema), ctrl.verifyOtp);
r.post('/guest-access', ctrl.guestAccess);
r.post('/refresh', validate(refreshSchema), ctrl.refresh);
r.post('/logout', ctrl.logout);

export default r;
