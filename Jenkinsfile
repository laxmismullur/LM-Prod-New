pipeline {
    agent any

    environment {
        APP_NAME    = 'lm-hospital'
        AWS_REGION  = 'us-east-1'
        GIT_REPO    = 'https://github.com/laxmismullur/LM-Hospital-Production.git'
        INSTANCE_ID = ''
        EC2_IP      = ''
        // BUILD_TAG removed from here — set after checkout once GIT_COMMIT is available
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 60, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: env.GIT_REPO,
                    credentialsId: 'github-credentials'
                script {
                    // Safe: GIT_COMMIT is now populated after checkout
                    def shortCommit = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.BUILD_TAG = "${env.BUILD_NUMBER}-${shortCommit}"
                    echo "Build tag: ${env.BUILD_TAG}"
                }
            }
        }

        stage('Backend: Test') {
            steps {
                dir('backend') {
                    sh '''
                        mvn clean test \
                            -Dspring.datasource.url=jdbc:h2:mem:testdb \
                            -Dspring.datasource.driverClassName=org.h2.Driver \
                            -Dspring.jpa.database-platform=org.hibernate.dialect.H2Dialect \
                            -B --no-transfer-progress
                    '''
                }
            }
            post {
                always { junit 'backend/target/surefire-reports/*.xml' }
            }
        }

        stage('Terraform: Provision EC2') {
            steps {
                withAWS(region: env.AWS_REGION) {
                    dir('devops/terraform') {
                        sh 'terraform init && terraform apply -auto-approve'
                        script {
                            env.INSTANCE_ID = sh(
                                script: 'terraform output -raw ec2_instance_id',
                                returnStdout: true
                            ).trim()
                            env.EC2_IP = sh(
                                script: 'terraform output -raw ec2_public_ip',
                                returnStdout: true
                            ).trim()
                            echo "EC2 Instance ID : ${env.INSTANCE_ID}"
                            echo "EC2 Public IP   : ${env.EC2_IP}"
                        }
                    }
                }
            }
        }

        stage('Wait for SSM') {
            steps {
                withAWS(region: env.AWS_REGION) {
                    script {
                        timeout(time: 10, unit: 'MINUTES') {
                            waitUntil(initialRecurrencePeriod: 20000) {
                                def status = sh(
                                    script: """
                                        aws ssm describe-instance-information \
                                          --filters Key=InstanceIds,Values=${env.INSTANCE_ID} \
                                          --query 'InstanceInformationList[0].PingStatus' \
                                          --output text 2>/dev/null || echo 'Pending'
                                    """,
                                    returnStdout: true
                                ).trim()
                                echo "SSM Status: ${status}"
                                return status == 'Online'
                            }
                        }
                    }
                }
            }
        }

        stage('Deploy via SSM') {
            when { branch 'main' }
            steps {
                withAWS(region: env.AWS_REGION) {
                    // Single Secret file credential — the entire .env stored in Jenkins
                    withCredentials([file(credentialsId: 'lm-hospital-env', variable: 'ENV_FILE')]) {
                        script {
                            // Step 1: Base64-encode the .env file and send it to EC2 via SSM
                            def envB64 = sh(
                                script: "base64 -w 0 '${ENV_FILE}'",
                                returnStdout: true
                            ).trim()

                            def writeEnvCmd = [
                                "mkdir -p /opt/lm-hospital /var/log/lm-hospital",
                                "chown ubuntu:ubuntu /opt/lm-hospital /var/log/lm-hospital",
                                "echo '${envB64}' | base64 -d > /opt/lm-hospital/.env",
                                "chmod 600 /opt/lm-hospital/.env",
                                "chown ubuntu:ubuntu /opt/lm-hospital/.env"
                            ]

                            def envCmdId = sh(
                                script: """
                                    aws ssm send-command \
                                      --instance-ids '${env.INSTANCE_ID}' \
                                      --document-name 'AWS-RunShellScript' \
                                      --parameters 'commands=${groovy.json.JsonOutput.toJson(writeEnvCmd)}' \
                                      --timeout-seconds 120 \
                                      --region '${env.AWS_REGION}' \
                                      --query 'Command.CommandId' \
                                      --output text
                                """,
                                returnStdout: true
                            ).trim()

                            // Wait for .env write to complete
                            timeout(time: 3, unit: 'MINUTES') {
                                waitUntil(initialRecurrencePeriod: 10000) {
                                    def s = sh(
                                        script: """
                                            aws ssm get-command-invocation \
                                              --command-id '${envCmdId}' \
                                              --instance-id '${env.INSTANCE_ID}' \
                                              --query 'Status' --output text 2>/dev/null || echo 'Pending'
                                        """,
                                        returnStdout: true
                                    ).trim()
                                    if (s == 'Failed') error("Writing .env failed — check SSM command ${envCmdId}")
                                    return s == 'Success'
                                }
                            }
                            echo "Secrets written to EC2 successfully."

                            // Step 2: Clone repo and run native deploy script
                            def deployCommands = [
                                "if [ -d '/opt/lm-hospital/.git' ]; then cd /opt/lm-hospital && git fetch origin && git reset --hard origin/main && git clean -fd; else git clone '${env.GIT_REPO}' /opt/lm-hospital; fi",
                                "chmod +x /opt/lm-hospital/devops/deploy.sh",
                                "GIT_REPO_URL='${env.GIT_REPO}' bash /opt/lm-hospital/devops/deploy.sh"
                            ]

                            env.CMD_ID = sh(
                                script: """
                                    aws ssm send-command \
                                      --instance-ids '${env.INSTANCE_ID}' \
                                      --document-name 'AWS-RunShellScript' \
                                      --parameters 'commands=${groovy.json.JsonOutput.toJson(deployCommands)}' \
                                      --timeout-seconds 1800 \
                                      --region '${env.AWS_REGION}' \
                                      --query 'Command.CommandId' \
                                      --output text
                                """,
                                returnStdout: true
                            ).trim()
                            echo "Deploy SSM Command ID: ${env.CMD_ID}"
                        }
                    }
                }
            }
        }

        stage('Verify Deployment') {
            when { branch 'main' }
            steps {
                withAWS(region: env.AWS_REGION) {
                    script {
                        timeout(time: 20, unit: 'MINUTES') {
                            waitUntil(initialRecurrencePeriod: 20000) {
                                def status = sh(
                                    script: """
                                        aws ssm get-command-invocation \
                                          --command-id '${env.CMD_ID}' \
                                          --instance-id '${env.INSTANCE_ID}' \
                                          --query 'Status' --output text 2>/dev/null || echo 'Pending'
                                    """,
                                    returnStdout: true
                                ).trim()
                                echo "Deploy status: ${status}"
                                if (status == 'Failed') {
                                    sh """
                                        aws ssm get-command-invocation \
                                          --command-id '${env.CMD_ID}' \
                                          --instance-id '${env.INSTANCE_ID}' \
                                          --query 'StandardErrorContent' --output text
                                    """
                                    error("Deployment failed — see SSM output above")
                                }
                                return status == 'Success'
                            }
                        }

                        sh """
                            echo "=== Deploy output ==="
                            aws ssm get-command-invocation \
                              --command-id '${env.CMD_ID}' \
                              --instance-id '${env.INSTANCE_ID}' \
                              --query 'StandardOutputContent' --output text
                        """
                    }
                }
            }
        }

        stage('Health Check') {
            when { branch 'main' }
            steps {
                sh """
                    echo "Waiting for services to stabilise..."
                    sleep 20

                    echo "Checking Spring Boot backend..."
                    STATUS=\$(curl -sf -o /dev/null -w "%{http_code}" http://${env.EC2_IP}:8085/actuator/health || echo '000')
                    [ "\$STATUS" = "200" ] \
                        && echo "Backend health check PASSED" \
                        || (echo "Backend health check FAILED — HTTP \$STATUS" && exit 1)

                    echo "Checking React frontend..."
                    STATUS=\$(curl -sf -o /dev/null -w "%{http_code}" http://${env.EC2_IP} || echo '000')
                    [ "\$STATUS" = "200" ] \
                        && echo "Frontend health check PASSED" \
                        || (echo "Frontend health check FAILED — HTTP \$STATUS" && exit 1)
                """
            }
        }
    }

    post {
        success {
            echo """
            ✔ Build ${env.BUILD_TAG} deployed successfully.
            App        : http://${env.EC2_IP}
            Backend    : http://${env.EC2_IP}:8085/actuator/health
            Grafana    : http://${env.EC2_IP}:3001
            Prometheus : http://${env.EC2_IP}:9090
            """
        }
        failure {
            echo "Pipeline failed — check logs above."
        }
        always {
            // Wrapped in node block to ensure workspace context is available
            // even if the pipeline failed before any node was allocated
            node('') {
                cleanWs(patterns: [
                    [pattern: 'devops/terraform/terraform.tfstate',        type: 'EXCLUDE'],
                    [pattern: 'devops/terraform/terraform.tfstate.backup',  type: 'EXCLUDE'],
                    [pattern: 'devops/terraform/.terraform/**',             type: 'EXCLUDE'],
                    [pattern: 'devops/terraform/.terraform.lock.hcl',       type: 'EXCLUDE']
                ])
            }
        }
    }
}