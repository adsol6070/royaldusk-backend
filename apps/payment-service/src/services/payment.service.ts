import { stripe } from './stripe.service';
import { razorpay } from './razorpay.service';

export const paymentProviders = {
  stripe: stripe,
  razorpay: razorpay,
};
