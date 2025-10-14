export const environment = {
  production: true,
  apiUrl: 'http://ec2-13-126-1-142.ap-south-1.compute.amazonaws.com:3000/v1',
  // apiAuthToken should NOT be hardcoded in production
  // Users must login to get their own token stored in localStorage
  apiAuthToken: ''
  // apiAuthToken: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwidXNlcm5hbWUiOiJhbGljZV8wMSIsImlhdCI6MTc1MTAxNzg0MiwiZXhwIjoxNzUxMTA0MjQyfQ.C2IZ05IGlWOxIZAaVasRwMQUy3om2Bt19GeW17vhyb8'

};
