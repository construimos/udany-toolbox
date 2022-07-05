import PassportGoogleStrategy from 'passport-google-oauth20';
import { AuthStrategy, StrategyOptions, StrategyProfile } from '../AuthStrategy';
import { AuthUser } from '../AuthUser';

interface GoogleProfile extends StrategyProfile {
	displayName: string;
	emails: { value: string }[];
	photos: { value: string }[];
}

interface GoogleStrategyOptions extends StrategyOptions {
	clientID: string;
	clientSecret: string;
}

export class GoogleStrategy<M extends AuthUser> extends AuthStrategy<M, GoogleProfile>{
	key = 'google';
	authOptions = { scope: ['profile', 'email'] };

	options: GoogleStrategyOptions;

	constructor(options: GoogleStrategyOptions) {
		super(options);

		this.options = options;
	}

	getStrategy(): Object {
		if (!this.strategy) {
			this.strategy = new PassportGoogleStrategy.Strategy(
				{
					clientID: this.options.clientID,
					clientSecret: this.options.clientSecret,
					callbackURL: this.callbackURL
				},
				(accessToken, refreshToken, profile, done) => this.verify(accessToken, refreshToken, profile, done)
			)
		}
		return this.strategy;
	}

	getProfileName(profile: GoogleProfile): string {
		return profile.displayName;
	}

	getProfileAvatarUrl(profile: GoogleProfile): string {
		return profile.photos?.length ? profile.photos[0].value : null;
	}

	getProfileEmail(profile: GoogleProfile): string {
		return profile.emails?.length ? profile.emails[0].value : null;
	}
}
