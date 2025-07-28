import cookie from 'js-cookie';

export const AUTHENTICATION_TOKEN_NAME = 'breeze.authjwt';
export const AUTHENTICATION_TOKEN_EXPIRATION = 20;
export const AUTHENTICATION_USER_NAME = 'breeze.user';

export function getToken(): string | undefined {
  return cookie.get(AUTHENTICATION_TOKEN_NAME);
}

export function setToken(token: string) {
  cookie.set(AUTHENTICATION_TOKEN_NAME, token, {
    expires: AUTHENTICATION_TOKEN_EXPIRATION,
  });
}

export function removeToken() {
  cookie.remove(AUTHENTICATION_TOKEN_NAME);
  cookie.remove(AUTHENTICATION_USER_NAME);
}
