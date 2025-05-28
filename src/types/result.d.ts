export type ResponseResult = Record<
  string,
  Record<
    string,
    {
      totalCount: number;
      contributors: { name: string; email: string; date: string }[];
    }
  >
>;
