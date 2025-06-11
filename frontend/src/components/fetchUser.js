
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


const mergeUniqueUsers = (data1, data2) => {
  const merged = [...data1, ...data2];

  return Array.from(new Map(merged.map(user => [user.id, user])).values());
};

