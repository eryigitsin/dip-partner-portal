import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

// OAuth provider configurations
export const OAUTH_PROVIDERS = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${process.env.VITE_APP_URL || 'https://partner.dip.tc'}/auth/google/callback`,
    scope: 'openid email profile',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
  },
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    redirectUri: `${process.env.VITE_APP_URL || 'https://partner.dip.tc'}/auth/linkedin/callback`,
    scope: 'r_liteprofile r_emailaddress',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/people/~:(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
    emailUrl: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))'
  }
};

export interface OAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture?: string;
  provider: 'google' | 'linkedin';
}

export function generateAuthUrl(provider: 'google' | 'linkedin', state?: string): string {
  const config = OAUTH_PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: config.clientId!,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state })
  });

  return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeCodeForTokens(provider: 'google' | 'linkedin', code: string) {
  const config = OAUTH_PROVIDERS[provider];
  
  const tokenParams = new URLSearchParams({
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: tokenParams.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
}

export async function fetchUserInfo(provider: 'google' | 'linkedin', accessToken: string): Promise<OAuthUser> {
  const config = OAUTH_PROVIDERS[provider];

  if (provider === 'google') {
    const response = await fetch(`${config.userInfoUrl}?access_token=${accessToken}`);
    if (!response.ok) {
      throw new Error('Failed to fetch Google user info');
    }
    
    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      firstName: data.given_name || '',
      lastName: data.family_name || '',
      picture: data.picture,
      provider: 'google'
    };
  }

  if (provider === 'linkedin') {
    // Fetch profile info
    const profileResponse = await fetch(config.userInfoUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch LinkedIn profile');
    }

    const profileData = await profileResponse.json();

    // Fetch email
    const emailResponse = await fetch((config as any).emailUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!emailResponse.ok) {
      throw new Error('Failed to fetch LinkedIn email');
    }

    const emailData = await emailResponse.json();
    const email = emailData.elements[0]?.['handle~']?.emailAddress;

    return {
      id: profileData.id,
      email,
      firstName: profileData.firstName?.localized?.['en_US'] || profileData.firstName?.localized?.['tr_TR'] || '',
      lastName: profileData.lastName?.localized?.['en_US'] || profileData.lastName?.localized?.['tr_TR'] || '',
      picture: profileData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier,
      provider: 'linkedin'
    };
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

export function createSupabaseJWT(user: OAuthUser): string {
  const payload = {
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    sub: `oauth_${user.provider}_${user.id}`,
    email: user.email,
    phone: '',
    app_metadata: {
      provider: user.provider,
      providers: [user.provider]
    },
    user_metadata: {
      first_name: user.firstName,
      last_name: user.lastName,
      full_name: `${user.firstName} ${user.lastName}`,
      avatar_url: user.picture,
      provider_id: user.id,
      email: user.email
    },
    role: 'authenticated'
  };

  return jwt.sign(payload, process.env.SUPABASE_JWT_SECRET!, { algorithm: 'HS256' });
}