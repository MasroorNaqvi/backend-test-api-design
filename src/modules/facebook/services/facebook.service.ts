import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ResponseResult } from 'src/types/result';

@Injectable()
export class FacebookService {
  constructor(private readonly httpService: HttpService) {}

  private ContributerCache: Map<string, ResponseResult> = new Map();
  private readonly githubToken = process.env.GITHUB_TOKEN;

  private handleGitHubErrors(err: any) {
    if (err.response) {
      const { status, data, headers } = err.response;

      if (
        (status === 403 || status === 429) &&
        data?.message?.includes('API rate limit exceeded')
      ) {
        const resetTimestamp = headers['x-ratelimit-reset'];
        const resetDate = resetTimestamp
          ? new Date(Number(resetTimestamp) * 1000)
          : null;

        const readableResetTime = resetDate
          ? resetDate.toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : 'later';

        throw new HttpException(
          `GitHub API rate limit exceeded. Please try again after ${readableResetTime}.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (status === 404) {
        throw new HttpException(`Repository not found.`, HttpStatus.NOT_FOUND);
      }
    }
  }
  private async getRepo(repoName: string) {
    console.log(repoName, '------');
    const url = `https://api.github.com/repos/facebook/${repoName}`;

    try {
      const res = await lastValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `token ${this.githubToken}` },
        }),
      );
      return res.data;
    } catch (err) {
      this.handleGitHubErrors(err);
      throw new HttpException(
        'Failed to fetch repository info from GitHub.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getContributors(repoName: string): Promise<any[]> {
    const contributors: any[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `https://api.github.com/repos/facebook/${repoName}/contributors?per_page=${perPage}&page=${page}`;
      try {
        const response = await lastValueFrom(
          this.httpService.get(url, {
            headers: { Authorization: `token ${this.githubToken}` },
          }),
        );
        const data = response.data;
        if (!data.length) break;
        contributors.push(...data);
        page++;
      } catch (err) {
        this.handleGitHubErrors(err);
        throw new HttpException(
          'Failed to fetch Contributors info from GitHub.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
    return contributors;
  }

  private async getFirstCommitAuthorObj(
    repoName: string,
    login: string,
  ): Promise<any | null> {
    console.log(repoName, '------------', login);
    const url = `https://api.github.com/repos/facebook/${repoName}/commits?author=${login}&per_page=1&sort=author-date&order=asc`;
    try {
      const response = await lastValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `token ${this.githubToken}` },
        }),
      );
      return response.data[0]?.commit?.author || null;
    } catch (err) {
      this.handleGitHubErrors(err);
      throw new HttpException(
        'Failed to fetch First Commit info from GitHub.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private validateDateParams(
    repoCreationDate: string,
    yearParam: string,
    monthParam: string,
  ) {
    const creationDate = new Date(repoCreationDate);

    if (yearParam) {
      const queryYear = parseInt(yearParam);
      if (isNaN(queryYear) || queryYear < creationDate.getUTCFullYear()) {
        throw new HttpException(
          'Requested year is before repository creation date.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (monthParam) {
        const queryMonth = parseInt(monthParam);
        const creationYear = creationDate.getUTCFullYear();
        const creationMonth = creationDate.getUTCMonth() + 1;
        if (queryYear === creationYear && queryMonth < creationMonth) {
          throw new HttpException(
            'Requested month is before repository creation date.',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (queryMonth < 1 || queryMonth > 12) {
          throw new HttpException(
            'Invalid month. Must be between 01 and 12.',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }
  }
  async computeNewContributors(
    repoName: string,
    yearParam?: string,
    monthParam?: string,
    refetch = false,
  ) {
    const seen = new Set<string>();
    let result: ResponseResult = {};

    const repo = await this.getRepo(repoName);
    const creationDate = repo.created_at;

    this.validateDateParams(creationDate, yearParam, monthParam);

    if (!this.ContributerCache.has(repoName) || refetch) {
      const contributors = await this.getContributors(repoName);

      for (const contributor of contributors.slice(0, 12)) {
        const login = contributor.login;
        if (seen.has(login)) continue;

        const firstCommitAuthor = await this.getFirstCommitAuthorObj(
          repoName,
          login,
        );
        if (!firstCommitAuthor) continue;

        seen.add(login);
        const date = new Date(firstCommitAuthor.date);
        const year = date.getUTCFullYear().toString();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');

        if (!result[year]) result[year] = {};
        if (!result[year][month])
          result[year][month] = { totalCount: 0, contributors: [] };

        result[year][month].contributors.push({
          name: firstCommitAuthor.name,
          date: firstCommitAuthor.date,
          email: firstCommitAuthor.email,
        });
        result[year][month].totalCount += 1;
      }
      this.ContributerCache.set(repoName, result);
    } else {
      result = this.ContributerCache.get(repoName);
    }

    if (yearParam && monthParam) {
      return {
        org: 'Facebook',
        repository: repoName,
        year: yearParam,
        month: monthParam,
        newContributors: result[yearParam]?.[monthParam] ?? [],
      };
    } else if (yearParam) {
      return {
        org: 'Facebook',
        repository: repoName,
        year: yearParam,
        newContributors: result[yearParam]
          ? {
              totalCount: Object.values(result[yearParam]).reduce(
                (acc, monthlyContributors) => {
                  return monthlyContributors.totalCount + acc;
                },
                0,
              ),
              monthlyContributors: result[yearParam],
            }
          : [],
      };
    }
  }
}
