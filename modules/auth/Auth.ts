import session, { SessionOptions } from 'express-session';
import passport from 'passport';
import { DatabaseModel } from '../orm';
import { AuthUser } from './AuthUser';
import { Application, Router, RequestHandler } from 'express';
import { AuthStrategy, GenericProfile } from './AuthStrategy';
import { Emitter } from '../base';

export interface RoutingOptions {
	baseUrl: string,
	routerPrefix: string,
	login?: string,
	logout?: string,
	session?: string,
	home?: string,

	postLogin?: RequestHandler
}

interface AuthOptions<M extends AuthUser> {
	userModel: DatabaseModel<M>;
	userFactory: (profile: GenericProfile) => M;

	strategies: AuthStrategy<M, any>[];

	routing?: RoutingOptions;

	sessionOptions?: SessionOptions;
}

export class Auth<M extends AuthUser>
	extends	Emitter<{
		beforeSave: [M, GenericProfile],
		afterSave: [M, GenericProfile]
	}>
	implements AuthOptions<M>
{
	userModel: DatabaseModel<M>;
	userFactory: (profile: GenericProfile) => M;

	strategies: AuthStrategy<M, any>[] = [];

	routing?: RoutingOptions;

	sessionOptions: SessionOptions;

	constructor({
		userModel,
		userFactory,

		strategies = [],

		routing,

		sessionOptions,
	}: AuthOptions<M>) {
		super();

		this.userModel = userModel;
		this.userFactory = userFactory;

		this.strategies.push(...strategies);

		this.routing = {
			login: 'login',
			logout: 'logout',
			session: 'session',
			home: '',
			postLogin: function (req, res) {
				res.redirect('/');
			},
			...routing
		};

		this.sessionOptions = {
			secret: 'cats',
			saveUninitialized: false,
			resave: false,
			...sessionOptions
		};
	}

	serializeUser(user: M, done: (err, obj) => void) {
		done(null, { id: user.id });
	}

	async deserializeUser(sessionUser: { id: number }, done: (err, obj) => void) {
		let user = await this.userModel.getById(sessionUser.id);

		done(null, user);
	}

	use(app: Application) {
		for (let strategy of this.strategies) {
			strategy.userModel = this.userModel;
			strategy.userFactory = this.userFactory;

			strategy.on('beforeSave', (user, profile) => {
				this.emit('beforeSave', [user, profile]);
			});

			strategy.on('afterSave', (user, profile) => {
				this.emit('afterSave', [user, profile]);
			});

			if (!strategy.callbackURL) strategy.callbackURL = this.getCallbackUrl(strategy);
			passport.use(strategy.getStrategy());
		}

		passport.serializeUser((user: M, done) => this.serializeUser(user, done));
		passport.deserializeUser((user: M, done) => this.deserializeUser(user, done));

		app.use(session(this.sessionOptions));
		app.use(passport.initialize({ userProperty: null }));
		app.use(passport.session({ pauseStream: false }));
	}

	getAuthUrl(strategy: AuthStrategy<M, any>) {
		return `${this.routing.baseUrl}${this.routing.routerPrefix}${strategy.key}/`;
	}
	getCallbackUrl(strategy: AuthStrategy<M, any>) {
		return `${this.routing.baseUrl}${this.routing.routerPrefix}${strategy.key}/callback`;
	}

	generateRoutes(router: Router) {
		for (let strategy of this.strategies) {
			strategy.generateRoutes(router, this.routing);
		}

		if (this.routing.logout) {
			router.get(`/${this.routing.logout}`, (req, res, next) => {
				req.logout(() => {});
				res.redirect(`/${this.routing.home}`);
			});
		}

		if (this.routing.session) {
			router.get(`/${this.routing.session}`, (req, res) => {
				if (req.user) {
					res.send((req.user as M).$serialize(true));
				} else {
					res.status(404);
					res.send(null);
				}
			});
		}
	}
}
