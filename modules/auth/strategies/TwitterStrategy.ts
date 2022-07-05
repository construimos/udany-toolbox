import PassportTwitterStrategy from 'passport-twitter';
import { AuthStrategy, StrategyOptions, StrategyProfile } from '../AuthStrategy';
import { AuthUser } from '../AuthUser';

interface TwitterProfile extends StrategyProfile {
	displayName: string;
	emails: { value: string }[];
	photos: { value: string }[];
}

interface TwitterStrategyOptions extends StrategyOptions {
	consumerKey: string;
	consumerSecret: string;
}

export class TwitterStrategy<M extends AuthUser> extends AuthStrategy<M, TwitterProfile>{
	key = 'twitter';

	options: TwitterStrategyOptions;

	constructor(options: TwitterStrategyOptions) {
		super(options);
		this.options = options;
	}

	getStrategy(): Object {
		if (!this.strategy) {
			this.strategy = new PassportTwitterStrategy.Strategy(
				{
					consumerKey: this.options.consumerKey,
					consumerSecret: this.options.consumerSecret,
					callbackURL: this.callbackURL,
					includeEmail: true
				},
				(accessToken, refreshToken, profile, done) => this.verify(accessToken, refreshToken, profile, done)
			)
		}
		return this.strategy;
	}

	getProfileName(profile: TwitterProfile): string {
		return profile.displayName;
	}

	getProfileAvatarUrl(profile: TwitterProfile): string {
		return profile.photos?.length ? profile.photos[0].value : null;
	}

	getProfileEmail(profile: TwitterProfile): string {
		return profile.emails?.length ? profile.emails[0].value : null;
	}
}
