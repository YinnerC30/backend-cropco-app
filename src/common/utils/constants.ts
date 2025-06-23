export const buildFrontendURL = (subdomain: string): { url: string } => {
  const isLocalEnvironment = process.env.STATUS_PROJECT === 'development';
  const url = isLocalEnvironment
    ? `http://${subdomain}.localhost:5173`
    : `https://${subdomain}.cropco.org`;
  return { url };
};
