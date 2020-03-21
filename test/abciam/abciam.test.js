import abciam from '../../src/abciam/abciam'

//verify token with openID connect
test('Verifies a token', () => {
  let provider = "google";
  let id_token = "test_token";
  expect(verifyToken(id_token, provider)).toBe(true);
});

// get user
test('Gets a user', () => {
  expect(retrieveUser(user_id, app_id)).toBe(true);
});
  //create user
  //retrieve user
  test('Creates a token', () => {
    expect(createToken(user_id, app_id)).toBe(true);
  });
//create auth token