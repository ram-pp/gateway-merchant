/** Converts a static-literal AST node (Literal/Array/Object/unary +-) to a JS value. No eval. */
function nodeToValue(node) {
  if (!node) return undefined;
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'ArrayExpression':
      return node.elements.map((el) => (el ? nodeToValue(el) : null));
    case 'ObjectExpression': {
      const obj = {};
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key = prop.key.type === 'Identifier' ? prop.key.name : nodeToValue(prop.key);
        obj[key] = nodeToValue(prop.value);
      }
      return obj;
    }
    case 'UnaryExpression':
      if (node.operator === '-') return -nodeToValue(node.argument);
      if (node.operator === '+') return +nodeToValue(node.argument);
      return undefined;
    default:
      return undefined;
  }
}

module.exports = { nodeToValue };
