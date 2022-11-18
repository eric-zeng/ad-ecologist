let serverUrl: string;
if (process.env.NODE_ENV === 'production') {
  serverUrl = 'https://adsurvey.kadara.cs.washington.edu';
} else {
  serverUrl = 'http://localhost:6800'
}
export default serverUrl;