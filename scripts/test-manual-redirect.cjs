async function testRedirectHeaders() {
  const res = await fetch('https://maps.app.goo.gl/r4V3va4hEcY4mPn79', {
    redirect: 'manual'
  });
  console.log('Status:', res.status);
  console.log('Location header:', res.headers.get('location'));
}

testRedirectHeaders();
