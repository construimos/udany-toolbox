import { DatabaseModel } from '../orm';
import { Emitter, Entity } from '../base';
import type { Strategy } from 'passport';
import passport from 'passport';
import { Router } from 'express';
import { RoutingOptions } from './Auth';

export interface StrategyProfile {
	id: string | number;
}

export interface StrategyOptions {
	idField: string;
	emailField?: string;
	callbackURL?: string;
}

export interface GenericProfile {
	id: string,
	name: string,
	email: string,
	avatar: string
}

export abstract class AuthStrategy<U extends Entity, P extends StrategyProfile>
	extends	Emitter<{
		beforeSave: [U, GenericProfile],
		afterSave: [U, GenericProfile]
	}>
	implements StrategyOptions
{
	key: string;
	authOptions: Object;
	callbackOptions: Object;

	idField: string;
	emailField: string;
	callbackURL: string;

	userModel: DatabaseModel<U>;
	userFactory: (profile: GenericProfile) => U;

	protected strategy: Strategy;

	constructor({
		idField,
		emailField = 'email',
		callbackURL = null
	}: StrategyOptions) {
		super();

		this.idField = idField;
		this.emailField = emailField;
		this.callbackURL = callbackURL;
	}

	async verify(accessToken: string, refreshToken: string, profile: P, done: (err, user: U) => void) {
		let data: GenericProfile = {
			id: this.getProfileId(profile),
			name: this.getProfileName(profile),
			email: this.getProfileEmail(profile),
			avatar: this.getProfileAvatarUrl(profile)
		}

		// Check if it's already in database
		let user = await this.userModel.selectFirst({
			filters: [{
				column: this.idField,
				values: data.id
			}]
		});

		// Check for email collisions
		if (!user && data.email) {
			user = await this.userModel.selectFirst({
				filters: [{
					column: this.emailField,
					values: data.email
				}]
			});

			if (user) {
				// TODO: Properly treat existing users to properly secure accounts from intrusion
				user[this.idField] = data.id;
			}
		}

		// Create new user
		if (!user) {
			user = this.userFactory(data);
			user[this.idField] = data.id;
		}

		this.emit('beforeSave', [user, data]);

		// Save any alterations
		await this.userModel.save(user);

		this.emit('afterSave', [user, data]);

		done(null, user);
	}

	abstract getStrategy(): Strategy

	getProfileId(profile: P): string {
		return profile.id.toString();
	}

	generateRoutes(router: Router, routing: RoutingOptions) {
		router.get(
			`/${this.key}`,
			passport.authenticate(this.key, this.authOptions)
		);

		router.get(
			`/${this.key}/callback`,
			passport.authenticate(this.key, { failureRedirect: `/${routing.login}`, ...this.callbackOptions }),
			routing.postLogin
		);
	}

	abstract getProfileName(profile: P):string
	abstract getProfileEmail(profile: P):string
	abstract getProfileAvatarUrl(profile: P):string
}
