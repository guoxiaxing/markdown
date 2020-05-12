export const flattenArr = arr => {
  return arr.reduce((prev, cur) => {
    prev[cur.id] = cur;
    return prev;
  }, {});
};

export const mapToArr = map => Object.values(map);

export const getParentNode = (node, parentClassName) => {
  let current = node;
  while (current) {
    if (current.classList.contains(parentClassName)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
};

export const timestamp2Str = timestamp => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};
