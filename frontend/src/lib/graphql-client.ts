import { GraphQLClient } from 'graphql-request';

const PONDER_GRAPHQL_URL = process.env.NEXT_PUBLIC_PONDER_URL || 'http://localhost:42069';

export const graphqlClient = new GraphQLClient(PONDER_GRAPHQL_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
});

export const gql = (strings: TemplateStringsArray, ...values: any[]) => {
  return strings.reduce((result, string, i) => {
    return result + string + (values[i] || '');
  }, '');
};