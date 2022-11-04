import PassportLocalStrategy from 'passport-local';
import { AuthStrategy, StrategyOptions, StrategyProfile } from '../AuthStrategy';
import { AuthUser } from '../AuthUser';
import type { Strategy } from 'passport';
import { RoutingOptions } from '../Auth';
import { Router } from 'express';
import passport from 'passport';

interface LocalProfile extends StrategyProfile {}

interface LocalStrategyOptions<M extends AuthUser> extends StrategyOptions {
	verifyPassword: (user: M, password: string) => Promise<boolean>|boolean
}

export class LocalStrategy<M extends AuthUser> extends AuthStrategy<M, LocalProfile>{
	key = 'local';
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

		if (user && await this.options.verifyPassword(user, password)) {
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

	generateRoutes(router: Router, routing: RoutingOptions) {
		router.post(
			`/${this.key}`,
			passport.authenticate(this.key),
			(req, res) => {
				if (req.user) {
					res.status(200);
					res.send((req.user as M).$serialize(true));
				} else {
					res.status(400);
					res.send('Oops');
				}
			}
		);
	}
}
