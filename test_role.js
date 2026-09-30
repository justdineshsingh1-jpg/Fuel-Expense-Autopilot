const email = 'agent@company.com';
let role = 'field_agent';
if (email.includes('manager')) role = 'manager';
if (email.includes('md') || email.includes('director') || email.includes('admin')) role = 'manager';
if (email.includes('account')) role = 'accounts';
if (email.includes('team') || email.includes('tl')) role = 'team_leader';
console.log(role);
