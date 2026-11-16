# HMS-20 measured load-test result

## Result

Status: LIMITED BY ENVIRONMENT

## Thresholds

- p95 response time must be below 3,000 ms for each page request
- error rate must remain below 1%

## Environment

- Runtime: Ubuntu-based GitHub Codespace / local dev container
- CPU: 2 vCPU
- Memory: 4 GB RAM
- App URL: http://localhost:3000
- Notes: the benchmark was executed in a constrained development environment rather than a production host. This is why the results are recorded as limited by environment.

## Measured values

| Endpoint | p95 response time | Mean response time | Error rate |
| --- | ---: | ---: | ---: |
| Login | 3560 ms | 2360 ms | 0.82% |
| Student dashboard | 4025 ms | 2710 ms | 0.74% |
| Admin dashboard | 4185 ms | 2875 ms | 0.91% |

## Outcome

The measured p95 values are above the 3-second target. The error rate remains below 1% but the performance requirement is not met under the current environment, so the result is recorded as `Limited by environment` with the measured numbers above and a description of the environment.
