import PassportLocalStrategy from 'passport-local';
import { AuthStrategy, StrategyOptions, StrategyProfile } from '../AuthStrategy';
import { AuthUser } from '../AuthUser';
import type { Strategy } from 'passport';

interface LocalProfile extends StrategyProfile {}

interface LocalStrategyOptions<M extends AuthUser> extends StrategyOptions {
	verifyPassword: (user: M, password: string) => boolean
}

export class LocalStrategy<M extends AuthUser> extends AuthStrategy<M, LocalProfile>{
	key = 'google';
	authOptions = { scope: ['profile', 'email'] };

	options: LocalStrategyOptions<M>;

	constructor(options: LocalStrategyOptions<M>) {
		super(options);

		this.options = options;
	}

	async localVerify(username: string, password: string, done: (err, user: M) => void) {
		let data = {
			email: username
		}

		// Check if it's already in database
		let user = await this.userModel.selectFirst({
				filters: [{
					column: this.emailField,
					values: data.email
				}]
			});

		if (user && this.options.verifyPassword(user, password)) {
			done(null, user);
		} else {
			done('Invalid password', null);
		}
	}

	getStrategy(): Strategy {
		if (!this.strategy) {
			this.strategy = new PassportLocalStrategy.Strategy(
				(username, password, done) => this.localVerify(username, password, done)
			)
		}
		return this.strategy;
	}

	getProfileName(profile: LocalProfile): string {
		return '';
	}

	getProfileAvatarUrl(profile: LocalProfile): string {
		return '';
	}

	getProfileEmail(profile: LocalProfile): string {
		return '';
	}
}
