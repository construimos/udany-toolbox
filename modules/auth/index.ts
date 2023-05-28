import { Auth } from './Auth';
import { GoogleStrategy } from './strategies/GoogleStrategy';
import { TwitterStrategy } from './strategies/TwitterStrategy';
import { LocalStrategy } from './strategies/LocalStrategy';
import { AuthUser } from './AuthUser';
import { AuthStrategy } from './AuthStrategy';

const strategies = {
	GoogleStrategy,
	TwitterStrategy,
	LocalStrategy
}

export {
	Auth,
	AuthUser,
	AuthStrategy,
	strategies
}
