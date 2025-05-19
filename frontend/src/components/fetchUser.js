/**
 * uses the given searchText to call two endpoints and return the search results
 * @param {String} searchText - user's search input
 * @param {Function} usersCallback -
 * @param {Function} errorCallback -
 * @return {JSON <object>} - search results
 */
export const fetchUser = async (searchText, usersCallback, errorCallback) => {
  try {
    const [response1, response2] = await Promise.all([
      fetch(`http://localhost:8000/search/?filter_type=user&q=${searchText}`, { credentials: "include" }),
      fetch(`http://localhost:8000/search/?filter=user&q=${searchText}`, { credentials: "include" })
    ]);
    const [data1, data2] = await Promise.all([response1.json(), response2.json()]);
    const userData1 = removeGroupUsers(data1.users);
    const userData2 = removeGroupUsers(data2.users);
    if (response1.ok && response2.ok) {
      const mergedData = mergeUniqueUsers(userData1, userData2);
      usersCallback(mergedData);
      errorCallback(null);
      return mergedData;
    } else {
      usersCallback([]);
      errorCallback(data1.Error || data2.Error);
    }
  } catch (error) {
    usersCallback([]);
    errorCallback('An error occured while fetching user data.');
  }
};

/**
 * takes in user data for all types of users (individual & group) and returns
 * user data of only individual users
 * @param {JSON <object>} data - user data (id, name, email, username) for all
 *                               types of users (individual & group)
 * @return {JSON <object>} - user data (id, name, email, username) for ONLY
 *                           individual users
 */
const removeGroupUsers = (data) => {
  const userArray = [];
  for (let i = 0; i < data.length; i++) {
    if (!data[i].email.includes("@group.local")) {
      userArray.push(data[i]);
    }
  }
  const userJSON = {
    "users": userArray
  };
  return userJSON.users;
};

/**
 * takes in two JSON objects of user data and merges them into one,
 * taking out any duplicates between the two, and returns the merged JSON
 * @param {JSON <object>} data1 - users data (id, name, email, username)
 *                                from one endpoint call
 * @param {JSON <object>} data2 - users data (id, name, email, username)
 *                                from another endpoint call
 * @return {JSON <object>} - merged user data from data1 and data2 with no
 *                           duplicate user data (id, name, email, username)
 */
const mergeUniqueUsers = (data1, data2) => {
  const merged = [...data1, ...data2];

  // Use a Set to remove duplicates based on user ID or another unique key
  return Array.from(new Map(merged.map(user => [user.id, user])).values());
};

