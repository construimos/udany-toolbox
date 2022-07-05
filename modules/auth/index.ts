import { Auth } from './Auth';
import { GoogleStrategy } from './strategies/GoogleStrategy';
import { TwitterStrategy } from './strategies/TwitterStrategy';
import { AuthUser } from './AuthUser';

const strategies = {
	GoogleStrategy,
	TwitterStrategy
}

export {
	Auth,
	AuthUser,
	strategies
}
