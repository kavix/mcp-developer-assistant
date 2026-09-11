/**
 * MCP Tools and Knowledge Base Implementation
 * 
 * Provides 3 MCP Tools:
 * 1. analyze_error
 * 2. find_possible_causes
 * 3. generate_debug_steps
 */

import {
  AnalyzeErrorInput,
  AnalyzeErrorOutput,
  FindPossibleCausesInput,
  FindPossibleCausesOutput,
  GenerateDebugStepsInput,
  GenerateDebugStepsOutput,
  ErrorKnowledgeItem,
} from './types';

// ============================================================================
// Deterministic In-Memory Knowledge Base
// ============================================================================

export const ERROR_KNOWLEDGE_BASE: ErrorKnowledgeItem[] = [
  {
    id: 'postgres_econnrefused',
    matchPatterns: [
      /ECONNREFUSED.*5432/i,
      /5432.*ECONNREFUSED/i,
      /connection to server at.*5432.*failed/i,
      /could not connect to server.*5432/i,
    ],
    category: 'database_connection',
    technology: 'PostgreSQL',
    severity: 'medium',
    summary: 'The application cannot establish a TCP connection to PostgreSQL on port 5432.',
    causes: [
      'PostgreSQL service is not running or crashed',
      'PostgreSQL is listening on a different port or host interface',
      'The hostname or IP address (e.g. localhost vs 127.0.0.1) is mismatched or unreachable',
      'A local or network firewall is blocking outbound/inbound traffic on port 5432',
      'PostgreSQL pg_hba.conf is rejecting the incoming client connection',
    ],
    debuggingSteps: [
      'Check whether the PostgreSQL daemon is active and running',
      'Verify that port 5432 is in LISTEN state on the target interface',
      'Test raw TCP socket reachability using netcat or curl',
      'Inspect PostgreSQL server logs for startup or authentication failures',
      'Verify pg_hba.conf and postgresql.conf listen_addresses settings',
    ],
    commands: [
      'systemctl status postgresql',
      'ss -lntp | grep 5432',
      'nc -vz 127.0.0.1 5432',
      'sudo -u postgres psql -c "\\l"',
    ],
  },
  {
    id: 'generic_econnrefused',
    matchPatterns: [
      /ECONNREFUSED/i,
      /connection refused/i,
      /failed to connect to localhost/i,
    ],
    category: 'network_connection',
    technology: 'TCP/IP Socket',
    severity: 'medium',
    summary: 'The target destination actively refused the connection attempt because no process is listening on the specified port.',
    causes: [
      'The target server process is not started or has stopped unexpectedly',
      'The service is bound to 127.0.0.1 but the client is requesting 0.0.0.0 or a container network bridge',
      'The port number configured in the client environment is incorrect',
      'Security group or firewall rule rejects the connection packet with RST',
    ],
    debuggingSteps: [
      'Confirm the target process is actively running and bound to the expected port',
      'Verify whether the listener binds to 127.0.0.1 (IPv4), ::1 (IPv6), or 0.0.0.0 (all interfaces)',
      'Confirm environment variables defining HOST and PORT values match the service',
      'Check host firewall rules (iptables, ufw, pfctl, or AWS security groups)',
    ],
    commands: [
      'ss -lntp',
      'curl -Iv http://127.0.0.1:<PORT>',
      'ps aux | grep <process_name>',
      'netstat -an | grep LISTEN',
    ],
  },
  {
    id: 'etimedout',
    matchPatterns: [
      /ETIMEDOUT/i,
      /connection timed out/i,
      /connect timeout/i,
      /i\/o timeout/i,
    ],
    category: 'network_timeout',
    technology: 'Network Socket',
    severity: 'high',
    summary: 'The connection attempt timed out waiting for a TCP handshake SYN-ACK response from the remote endpoint.',
    causes: [
      'A network firewall, VPC Security Group, or Network ACL silently drops packets',
      'The remote host or server is offline, routing is misconfigured, or gateway is unreachable',
      'Network congestion or high packet loss across the WAN/LAN path',
      'Application connection timeout threshold is set too low for high-latency connections',
    ],
    debuggingSteps: [
      'Verify network routing and MTU issues using ping and traceroute/mtr',
      'Verify AWS VPC Route Tables, Security Group outbound/inbound rules, and NAT Gateway status',
      'Confirm remote host availability and test TCP connection with explicit timeout',
      'Review client-side timeout settings and retry logic',
    ],
    commands: [
      'traceroute -T -p 443 <hostname>',
      'curl -Iv --connect-timeout 5 https://<hostname>',
      'ping -c 4 <hostname_or_ip>',
    ],
  },
  {
    id: 'enotfound',
    matchPatterns: [
      /ENOTFOUND/i,
      /getaddrinfo ENOTFOUND/i,
      /could not resolve host/i,
      /Name or service not known/i,
      /no such host/i,
    ],
    category: 'dns_resolution',
    technology: 'DNS Resolver',
    severity: 'medium',
    summary: 'The system DNS resolver could not resolve the given hostname into an IP address.',
    causes: [
      'Typo or incorrect hostname in environment configuration or connection string',
      'DNS server (resolv.conf) is unreachable or not responding',
      'The domain name does not exist or has expired DNS records',
      'Internal service discovery or VPN connection is disconnected',
    ],
    debuggingSteps: [
      'Validate hostname spelling in configuration files and environment variables',
      'Perform DNS lookups using dig or nslookup against standard resolvers',
      'Inspect /etc/resolv.conf and systemd-resolved status',
      'Check internal VPN / VPC private hosted zone associations (Route 53)',
    ],
    commands: [
      'dig +short <hostname>',
      'nslookup <hostname>',
      'cat /etc/resolv.conf',
    ],
  },
  {
    id: 'eaddrinuse',
    matchPatterns: [
      /EADDRINUSE/i,
      /address already in use/i,
      /port.*already in use/i,
    ],
    category: 'port_conflict',
    technology: 'Operating System Kernel',
    severity: 'medium',
    summary: 'The process failed to bind to the network address and port because another process is already listening on it.',
    causes: [
      'A previous instance of the application is still running in the background',
      'A conflicting application or daemon is configured on the same port',
      'Zombie or orphan process holding onto the port after abnormal termination',
      'SO_REUSEADDR socket option is not configured during rapid restart cycles',
    ],
    debuggingSteps: [
      'Identify which process ID (PID) currently occupies the specified port',
      'Terminate the orphan or lingering background process gracefully or forcefully',
      'Configure the application to use an alternative available port via PORT environment variable',
    ],
    commands: [
      'lsof -i :<PORT> -sTCP:LISTEN',
      'fuser -k <PORT>/tcp',
      'ss -lptn "sport = :<PORT>"',
    ],
  },
  {
    id: 'enoent',
    matchPatterns: [
      /ENOENT/i,
      /no such file or directory/i,
      /file not found/i,
    ],
    category: 'filesystem_error',
    technology: 'File System (POSIX/OS)',
    severity: 'low',
    summary: 'The requested file or directory path does not exist on the filesystem.',
    causes: [
      'Relative path resolved against an unexpected working directory (cwd)',
      'Missing configuration file (.env, build artifact, or certificate)',
      'Typo in file or directory path string',
      'File was not copied into the build or container image during packaging',
    ],
    debuggingSteps: [
      'Inspect the current working directory of the executing process',
      'Confirm the exact absolute path and verify file presence',
      'Verify build scripts and Dockerfile/Amplify build steps copy required assets',
    ],
    commands: [
      'pwd',
      'ls -la <path_to_parent_dir>',
      'find . -name "<filename>"',
    ],
  },
  {
    id: 'permission_denied',
    matchPatterns: [
      /EACCES/i,
      /Permission denied/i,
      /PermissionError.*\[Errno 13\]/i,
      /access denied/i,
    ],
    category: 'permissions_authorization',
    technology: 'OS / Filesystem Access Control',
    severity: 'medium',
    summary: 'The process attempted an operation without the required user, file, or socket permissions.',
    causes: [
      'Process runs as an unprivileged user attempting to read/write a root-owned file',
      'Attempt to bind to a privileged port (< 1024) without CAP_NET_BIND_SERVICE or root',
      'Filesystem mode permissions (chmod) or ownership (chown) are overly restrictive',
      'SELinux, AppArmor, or macOS sandbox policy blocks the action',
    ],
    debuggingSteps: [
      'Verify current execution user ID and group ID (whoami, id)',
      'Check file permissions and ownership with ls -l',
      'Adjust file permissions or grant appropriate capability to the binary',
    ],
    commands: [
      'id -u -n',
      'ls -la <file_or_directory>',
      'chmod u+rw <file_or_directory>',
      'sudo chown $(whoami) <file_or_directory>',
    ],
  },
  {
    id: 'http_502_bad_gateway',
    matchPatterns: [
      /502 Bad Gateway/i,
      /502/i,
      /Bad Gateway/i,
    ],
    category: 'http_gateway_error',
    technology: 'Reverse Proxy (Nginx / CloudFront / ALB)',
    severity: 'high',
    summary: 'The reverse proxy or gateway received an invalid or empty response from the upstream application server.',
    causes: [
      'Upstream backend server crashed, restarted, or is not running',
      'Upstream backend exceeded proxy timeout thresholds while processing requests',
      'Misconfigured reverse proxy upstream port, protocol, or socket path',
      'Out of memory (OOM) killer terminated the backend worker process',
    ],
    debuggingSteps: [
      'Check upstream backend application logs and service health status',
      'Inspect reverse proxy error logs (Nginx error.log, ALB target group health)',
      'Review proxy proxy_read_timeout and keepalive timeout configurations',
      'Check server memory and system journal for OOM killer events',
    ],
    commands: [
      'sudo tail -n 50 /var/log/nginx/error.log',
      'journalctl -u <backend_service> -n 50 --no-pager',
      'dmesg -T | grep -i oom',
      'curl -Iv http://127.0.0.1:<upstream_port>/health',
    ],
  },
  {
    id: 'http_503_service_unavailable',
    matchPatterns: [
      /503 Service Unavailable/i,
      /503/i,
      /Service Unavailable/i,
    ],
    category: 'http_service_error',
    technology: 'HTTP Server / Load Balancer',
    severity: 'high',
    summary: 'The server or load balancer is currently unable to handle the request due to maintenance, overload, or no healthy backends.',
    causes: [
      'All targets in the load balancer target group failed health checks',
      'The server is overloaded and has exhausted its thread/worker connection pool',
      'Service is undergoing scheduled deployment or maintenance',
      'Rate limiting or capacity shedding mechanisms triggered',
    ],
    debuggingSteps: [
      'Check Load Balancer target group health check metrics and failing targets',
      'Inspect CPU, memory, and thread utilization on the application instances',
      'Verify application /health endpoint returns HTTP 200 OK within timeout',
    ],
    commands: [
      'curl -Iv http://<target_ip>:<port>/health',
      'top -b -n 1 | head -n 20',
      'systemctl status <app_service>',
    ],
  },
  {
    id: 'http_404_not_found',
    matchPatterns: [
      /404 Not Found/i,
      /404/i,
      /Cannot GET/i,
      /Cannot POST/i,
    ],
    category: 'http_routing_error',
    technology: 'HTTP Server / API Gateway',
    severity: 'low',
    summary: 'The server could not find the requested URL path or route endpoint.',
    causes: [
      'Typo or mismatch in URL pathname, route parameters, or HTTP method (GET vs POST)',
      'Route is not registered in the web framework or API Gateway routing table',
      'Base URL prefix (e.g. /api/v1) is missing or mismatched',
      'Static asset was not generated in output directory during build',
    ],
    debuggingSteps: [
      'Verify exact URL path, parameters, and HTTP method against API documentation',
      'Check router definitions in server code (Next.js App Router, Express, FastAPI)',
      'Confirm base path and rewrite rules in reverse proxy or next.config.ts',
    ],
    commands: [
      'curl -Iv -X GET https://<hostname>/<path>',
      'cat src/app/<path>/route.ts 2>/dev/null || echo "Route file not found"',
    ],
  },
  {
    id: 'http_401_unauthorized',
    matchPatterns: [
      /401 Unauthorized/i,
      /401/i,
      /Unauthorized/i,
      /invalid token/i,
      /jwt expired/i,
    ],
    category: 'authentication_error',
    technology: 'Identity & Authentication (JWT / OAuth / AWS IAM)',
    severity: 'medium',
    summary: 'The request lacks valid authentication credentials for the requested resource.',
    causes: [
      'Authorization header is missing or lacks Bearer token prefix',
      'JWT token has expired or signature verification failed with public key',
      'API key is invalid, revoked, or incorrectly passed',
      'AWS credentials expired or lack AssumeRole session tokens',
    ],
    debuggingSteps: [
      'Check that Authorization: Bearer <token> header is properly attached to requests',
      'Inspect JWT payload expiration timestamp (exp claim) via jwt.io or CLI',
      'Verify token signing secret or JWKS endpoint configuration',
      'Verify AWS credential validity using sts get-caller-identity',
    ],
    commands: [
      'aws sts get-caller-identity',
      'echo "<jwt_token>" | cut -d. -f2 | base64 -d 2>/dev/null',
      'curl -Iv -H "Authorization: Bearer <token>" https://<api_endpoint>',
    ],
  },
  {
    id: 'http_403_forbidden',
    matchPatterns: [
      /403 Forbidden/i,
      /403/i,
      /Forbidden/i,
      /AccessDenied/i,
      /User is not authorized/i,
    ],
    category: 'authorization_error',
    technology: 'RBAC / IAM Authorization',
    severity: 'medium',
    summary: 'The authenticated identity does not have sufficient permissions to perform the requested action.',
    causes: [
      'The user or IAM role lacks the specific IAM action or RBAC permission',
      'Resource-based policy (e.g. S3 bucket policy, KMS key policy) explicitly denies access',
      'IP address or VPC restriction policy is blocking the client IP',
      'CORS origin is blocked or cross-tenant boundary check failed',
    ],
    debuggingSteps: [
      'Inspect IAM policy statements attached to the executing role or user',
      'Check AWS CloudTrail for detailed AccessDenied error messages and required actions',
      'Verify explicit deny statements in SCPs (Service Control Policies) or KMS policies',
    ],
    commands: [
      'aws iam get-role-policy --role-name <role_name> --policy-name <policy_name>',
      'aws sts get-caller-identity',
    ],
  },
  {
    id: 'cors_error',
    matchPatterns: [
      /CORS/i,
      /Cross-Origin Request Blocked/i,
      /No 'Access-Control-Allow-Origin' header/i,
      /Access-Control-Allow-Origin/i,
    ],
    category: 'browser_security_cors',
    technology: 'Browser Web Security (CORS)',
    severity: 'medium',
    summary: 'The browser blocked cross-origin resource sharing because the server did not supply matching Access-Control headers.',
    causes: [
      'The API server does not return the Access-Control-Allow-Origin header',
      'Preflight OPTIONS request is rejected or returns HTTP 403/404/500 instead of 200/204',
      'Credentials mode (cookies/Authorization) enabled with wildcard * origin',
      'Allowed headers or allowed HTTP methods do not include the headers requested by the client',
    ],
    debuggingSteps: [
      'Inspect preflight OPTIONS response headers using curl or browser DevTools Network tab',
      'Ensure server returns Access-Control-Allow-Origin matching the client origin',
      'Add OPTIONS handler returning 200/204 with required headers: Origin, Content-Type, Authorization',
    ],
    commands: [
      'curl -Iv -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" https://<api>/endpoint',
    ],
  },
  {
    id: 'module_not_found',
    matchPatterns: [
      /Module not found/i,
      /Cannot find module/i,
      /ERR_MODULE_NOT_FOUND/i,
      /ModuleNotFoundError/i,
    ],
    category: 'dependency_resolution',
    technology: 'Node.js / Python Runtime',
    severity: 'low',
    summary: 'The runtime environment or compiler could not locate the imported package or module.',
    causes: [
      'Package is not installed in node_modules or Python virtual environment',
      'Missing entry in package.json dependencies or requirements.txt',
      'File path typo or incorrect relative import path',
      'Case sensitivity difference between macOS/Windows and Linux CI/CD environments',
    ],
    debuggingSteps: [
      'Confirm the package is declared in package.json or requirements.txt',
      'Run package manager install command (npm install / pip install)',
      'Check import file path casing matches filesystem exactly (Linux is case-sensitive)',
    ],
    commands: [
      'npm list <package_name>',
      'npm install <package_name>',
      'pip show <package_name>',
      'find src -type f | grep -i <module_name>',
    ],
  },
  {
    id: 'cannot_connect_db',
    matchPatterns: [
      /Cannot connect to database/i,
      /Can't connect to MySQL/i,
      /MongoNetworkError/i,
      /Connection to database failed/i,
    ],
    category: 'database_connection',
    technology: 'Relational / NoSQL Database',
    severity: 'high',
    summary: 'The application failed to open a database connection pool or socket to the database server.',
    causes: [
      'Database connection string (DATABASE_URL) has invalid syntax, host, or credentials',
      'Database server is stopped or rebooting during maintenance window',
      'Connection pool size exceeded maximum allowed client connections',
      'VPC security group does not allow ingress from the application subnet',
    ],
    debuggingSteps: [
      'Verify connection string host, port, database name, and credentials in .env',
      'Check database server metrics (active connections, memory, CPU)',
      'Test direct connectivity with database client CLI (psql, mysql, mongosh)',
      'Inspect database firewall / security group ingress rules',
    ],
    commands: [
      'psql "$DATABASE_URL" -c "SELECT 1;"',
      'mysql -h <host> -u <user> -p<password> -e "STATUS;"',
    ],
  },
  {
    id: 'k8s_oomkilled',
    matchPatterns: [
      /OOMKilled/i,
      /exit code 137/i,
      /out of memory/i,
    ],
    category: 'container_resource_exhaustion',
    technology: 'Kubernetes / Linux cgroups',
    severity: 'critical',
    summary: 'The container exceeded its memory limit and was terminated by the Linux cgroups Out-Of-Memory (OOM) killer (exit code 137).',
    causes: [
      'Memory limit in pod spec resources.limits.memory is configured too low',
      'Application memory leak (unreleased buffers, caching without eviction, open handles)',
      'Spike in concurrent request volume or large batch payload processing',
      'JVM heap or Node.js V8 max_old_space_size exceeds container cgroup limit',
    ],
    debuggingSteps: [
      'Inspect pod termination reason and exit code via kubectl describe pod',
      'Review memory metrics leading up to termination using kubectl top or Prometheus/Grafana',
      'Tune container memory limits or optimize application heap allocation',
      'Profile application for heap leaks or unbound in-memory queues',
    ],
    commands: [
      'kubectl describe pod <pod_name> | grep -E "Exit Code|OOMKilled|Reason"',
      'kubectl logs <pod_name> --previous',
      'kubectl top pod <pod_name>',
    ],
  },
  {
    id: 'k8s_crashloopbackoff',
    matchPatterns: [
      /CrashLoopBackOff/i,
      /back-off.*restarting failed container/i,
    ],
    category: 'container_lifecycle_failure',
    technology: 'Kubernetes Pod Lifecycle',
    severity: 'critical',
    summary: 'The container repeatedly crashed on startup or health check failure, and Kubernetes is backing off restarts.',
    causes: [
      'Application threw an unhandled fatal exception immediately during initialization',
      'Missing required environment variables or secrets referenced in pod manifest',
      'Liveness / readiness probe failed consecutively due to slow startup or incorrect endpoint',
      'Entrypoint or command in container image exited with non-zero status',
    ],
    debuggingSteps: [
      'Read container exit logs from the previously crashed container instance',
      'Check pod events to observe exact lifecycle failures and restart back-off timers',
      'Verify all ConfigMaps, Secrets, and env variables mounted into the pod exist',
      'Increase liveness probe initialDelaySeconds if startup requires initialization time',
    ],
    commands: [
      'kubectl logs <pod_name> -c <container_name> --previous',
      'kubectl describe pod <pod_name>',
      'kubectl get events --sort-by=.metadata.creationTimestamp',
    ],
  },
  {
    id: 'k8s_imagepullbackoff',
    matchPatterns: [
      /ImagePullBackOff/i,
      /ErrImagePull/i,
      /Failed to pull image/i,
      /manifest unknown/i,
    ],
    category: 'container_image_pull_error',
    technology: 'Kubernetes Kubelet / Container Registry',
    severity: 'high',
    summary: 'Kubernetes kubelet cannot download the specified container image from the container registry.',
    causes: [
      'Container image tag or repository name is misspelled or does not exist',
      'Image repository is private and imagePullSecrets are missing or credentials expired',
      'ECR / Docker Hub registry rate limit reached or registry outage',
      'Node lacks internet or VPC endpoint access to the container registry',
    ],
    debuggingSteps: [
      'Verify the exact image repository URI and tag exist in the registry (ECR / Docker Hub)',
      'Confirm imagePullSecrets are configured in the pod spec or service account',
      'Verify worker node IAM role has AmazonEC2ContainerRegistryReadOnly permissions',
    ],
    commands: [
      'kubectl describe pod <pod_name> | grep -A 10 Events:',
      'aws ecr describe-images --repository-name <repo_name>',
      'kubectl get secret <secret_name> -o yaml',
    ],
  },
  {
    id: 'connection_reset_by_peer',
    matchPatterns: [
      /connection reset by peer/i,
      /ECONNRESET/i,
      /read ECONNRESET/i,
      /socket hang up/i,
    ],
    category: 'tcp_connection_reset',
    technology: 'TCP Socket Layer',
    severity: 'medium',
    summary: 'The remote server abruptly terminated the active TCP connection by sending a TCP RST packet.',
    causes: [
      'The remote service crashed or was restarted while the connection was active',
      'Load balancer or proxy idle timeout expired and severed the connection',
      'Keep-alive connection closed on one end while the client sent another request (race condition)',
      'Firewall or stateful NAT dropped connection tracking table entry',
    ],
    debuggingSteps: [
      'Check remote service uptime and error logs for crashes or restarts',
      'Verify keep-alive timeout settings match between proxy and application server',
      'Implement client-side exponential backoff retry for idempotent requests',
    ],
    commands: [
      'ss -tin',
      'journalctl -u <service> --since "10 minutes ago"',
      'curl -Iv -k --keepalive-time 60 https://<hostname>',
    ],
  },
];

// Fallback for completely unrecognized errors
export const UNKNOWN_ERROR_FALLBACK: ErrorKnowledgeItem = {
  id: 'unknown_error',
  matchPatterns: [],
  category: 'unclassified_application_error',
  technology: 'Application Runtime',
  severity: 'medium',
  summary: 'The application encountered an unclassified runtime error or unexpected exception.',
  causes: [
    'Unhandled exception or uncaught error condition in application logic',
    'Unexpected input format, invalid argument, or missing configuration parameter',
    'Third-party dependency failure or transient upstream service issue',
    'System resource constraint or missing environment configuration',
  ],
  debuggingSteps: [
    'Inspect stack trace to locate the exact source file and line number',
    'Check application logs preceding the error for contextual triggers',
    'Reproduce the error in a local environment with debug logging enabled',
    'Validate all relevant environment variables and external service dependencies',
  ],
  commands: [
    'tail -f logs/app.log',
    'DEBUG=* npm start',
    'env | grep -iE "app|node|aws"',
  ],
};

// ============================================================================
// Knowledge Base Matcher Helper
// ============================================================================

export function findKnowledgeItem(errorText: string): ErrorKnowledgeItem {
  if (!errorText || typeof errorText !== 'string') {
    return UNKNOWN_ERROR_FALLBACK;
  }

  const trimmed = errorText.trim();
  if (!trimmed) {
    return UNKNOWN_ERROR_FALLBACK;
  }

  for (const item of ERROR_KNOWLEDGE_BASE) {
    for (const pattern of item.matchPatterns) {
      if (typeof pattern === 'string') {
        if (trimmed.toLowerCase().includes(pattern.toLowerCase())) {
          return item;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(trimmed)) {
          return item;
        }
      }
    }
  }

  return UNKNOWN_ERROR_FALLBACK;
}

// ============================================================================
// MCP Tool 1: analyze_error
// ============================================================================

/**
 * Analyzes an error string and returns structured metadata.
 */
export function analyzeError(input: AnalyzeErrorInput): AnalyzeErrorOutput {
  const item = findKnowledgeItem(input.error);
  return {
    category: item.category,
    technology: item.technology,
    severity: item.severity,
    summary: item.summary,
  };
}

// ============================================================================
// MCP Tool 2: find_possible_causes
// ============================================================================

/**
 * Finds likely causes based on category and technology.
 */
export function findPossibleCauses(input: FindPossibleCausesInput): FindPossibleCausesOutput {
  // Search knowledge base for exact category and technology match
  const match = ERROR_KNOWLEDGE_BASE.find(
    (item) => item.category === input.category && item.technology === input.technology
  );

  if (match) {
    return { causes: match.causes };
  }

  // Secondary match on category alone
  const categoryMatch = ERROR_KNOWLEDGE_BASE.find((item) => item.category === input.category);
  if (categoryMatch) {
    return { causes: categoryMatch.causes };
  }

  return { causes: UNKNOWN_ERROR_FALLBACK.causes };
}

// ============================================================================
// MCP Tool 3: generate_debug_steps
// ============================================================================

/**
 * Generates recommended debugging steps and example shell commands.
 */
export function generateDebugSteps(input: GenerateDebugStepsInput): GenerateDebugStepsOutput {
  const match = ERROR_KNOWLEDGE_BASE.find(
    (item) => item.category === input.category && item.technology === input.technology
  );

  if (match) {
    return {
      steps: match.debuggingSteps,
      commands: match.commands,
    };
  }

  const categoryMatch = ERROR_KNOWLEDGE_BASE.find((item) => item.category === input.category);
  if (categoryMatch) {
    return {
      steps: categoryMatch.debuggingSteps,
      commands: categoryMatch.commands,
    };
  }

  return {
    steps: UNKNOWN_ERROR_FALLBACK.debuggingSteps,
    commands: UNKNOWN_ERROR_FALLBACK.commands,
  };
}
