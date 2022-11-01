import { Auth } from './Auth';
import { GoogleStrategy } from './strategies/GoogleStrategy';
import { TwitterStrategy } from './strategies/TwitterStrategy';
import { AuthUser } from './AuthUser';
import { AuthStrategy } from './AuthStrategy';

const strategies = {
	GoogleStrategy,
	TwitterStrategy
}

export {
	Auth,
	AuthUser,
	AuthStrategy,
	strategies
}
