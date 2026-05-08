def INSTANCE_ID = ""
def EC2_IP = ""
def CMD_ID = ""

pipeline {

    agent any

    environment {
        APP_NAME   = 'lm-hospital'
        AWS_REGION = 'us-east-1'
        GIT_REPO   = 'https://github.com/laxmismullur/LM-Hospital-Production.git'
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
                    def shortCommit = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
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
                always {
                    junit(
                        testResults: 'backend/target/surefire-reports/*.xml',
                        allowEmptyResults: true
                    )
                }
            }
        }

        stage('Terraform: Provision EC2') {
            steps {
                withAWS(region: env.AWS_REGION) {
                    script {
                        sh """
                            cd ${env.WORKSPACE}/devops/terraform
                            terraform init -no-color
                            terraform apply -auto-approve -no-color
                        """
                        sh """
                            cd ${env.WORKSPACE}/devops/terraform
                            terraform output
                        """
                        INSTANCE_ID = sh(
                            script: """
                                cd ${env.WORKSPACE}/devops/terraform
                                terraform output -raw ec2_instance_id
                            """,
                            returnStdout: true
                        ).trim()
                        EC2_IP = sh(
                            script: """
                                cd ${env.WORKSPACE}/devops/terraform
                                terraform output -raw ec2_public_ip
                            """,
                            returnStdout: true
                        ).trim()
                        echo "RAW INSTANCE_ID: '${INSTANCE_ID}'"
                        echo "RAW PUBLIC_IP : '${EC2_IP}'"
                        if (!INSTANCE_ID?.trim()) {
                            error("INSTANCE_ID is empty — terraform output failed")
                        }
                        echo "EC2 Instance ID : ${INSTANCE_ID}"
                        echo "EC2 Public IP   : ${EC2_IP}"
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
                                          --filters Key=InstanceIds,Values=${INSTANCE_ID} \
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
            steps {
                withAWS(region: env.AWS_REGION) {
                    withCredentials([
                        file(credentialsId: 'lm-hospital-env', variable: 'ENV_FILE')
                    ]) {
                        script {
                            def envB64 = sh(
                                script: 'base64 -w 0 $ENV_FILE',
                                returnStdout: true
                            ).trim()

                            def writeEnvCmd = [
                                "mkdir -p /home/ubuntu/lm-hospital /var/log/lm-hospital",
                                "chown ubuntu:ubuntu /home/ubuntu/lm-hospital /var/log/lm-hospital",
                                "echo '${envB64}' | base64 -d > /home/ubuntu/lm-hospital/.env",
                                "chmod 600 /home/ubuntu/lm-hospital/.env",
                                "chown ubuntu:ubuntu /home/ubuntu/lm-hospital/.env"
                            ]

                            def envCmdId = sh(
                                script: """
                                    aws ssm send-command \
                                      --instance-ids '${INSTANCE_ID}' \
                                      --document-name 'AWS-RunShellScript' \
                                      --parameters 'commands=${groovy.json.JsonOutput.toJson(writeEnvCmd)}' \
                                      --timeout-seconds 120 \
                                      --region '${env.AWS_REGION}' \
                                      --query 'Command.CommandId' \
                                      --output text
                                """,
                                returnStdout: true
                            ).trim()

                            timeout(time: 3, unit: 'MINUTES') {
                                waitUntil(initialRecurrencePeriod: 10000) {
                                    def s = sh(
                                        script: """
                                            aws ssm get-command-invocation \
                                              --command-id '${envCmdId}' \
                                              --instance-id '${INSTANCE_ID}' \
                                              --query 'Status' \
                                              --output text 2>/dev/null || echo 'Pending'
                                        """,
                                        returnStdout: true
                                    ).trim()
                                    echo "ENV upload status: ${s}"
                                    if (s == 'Failed') {
                                        sh """
                                            aws ssm get-command-invocation \
                                              --command-id '${envCmdId}' \
                                              --instance-id '${INSTANCE_ID}' \
                                              --query 'StandardErrorContent' \
                                              --output text
                                        """
                                        error("Writing .env failed")
                                    }
                                    return s == 'Success'
                                }
                            }

                            echo "Secrets written to EC2 successfully."

                            def deployCommands = [
                                "if [ -d /home/ubuntu/lm-hospital/.git ]; then cd /home/ubuntu/lm-hospital && sudo -u ubuntu git fetch origin && sudo -u ubuntu git reset --hard origin/main && sudo -u ubuntu git clean -fd; else rm -rf /home/ubuntu/lm-hospital && sudo -u ubuntu git clone ${env.GIT_REPO} /home/ubuntu/lm-hospital; fi",
                                "chown -R ubuntu:ubuntu /home/ubuntu/lm-hospital",
                                "cp /home/ubuntu/lm-hospital/.env /home/ubuntu/lm-hospital/.env.bak 2>/dev/null || true",
                                "echo '${envB64}' | base64 -d > /home/ubuntu/lm-hospital/.env",
                                "chmod 600 /home/ubuntu/lm-hospital/.env && chown ubuntu:ubuntu /home/ubuntu/lm-hospital/.env",
                                "chmod +x /home/ubuntu/lm-hospital/devops/deploy.sh",
                                "cd /home/ubuntu/lm-hospital && GIT_REPO_URL=${env.GIT_REPO} bash devops/deploy.sh"
                            ]

                            CMD_ID = sh(
                                script: """
                                    aws ssm send-command \
                                      --instance-ids '${INSTANCE_ID}' \
                                      --document-name 'AWS-RunShellScript' \
                                      --parameters 'commands=${groovy.json.JsonOutput.toJson(deployCommands)}' \
                                      --timeout-seconds 1800 \
                                      --region '${env.AWS_REGION}' \
                                      --query 'Command.CommandId' \
                                      --output text
                                """,
                                returnStdout: true
                            ).trim()

                            echo "Deploy SSM Command ID: ${CMD_ID}"
                        }
                    }
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                withAWS(region: env.AWS_REGION) {
                    script {
                        timeout(time: 20, unit: 'MINUTES') {
                            waitUntil(initialRecurrencePeriod: 20000) {
                                def status = sh(
                                    script: """
                                        aws ssm get-command-invocation \
                                          --command-id '${CMD_ID}' \
                                          --instance-id '${INSTANCE_ID}' \
                                          --query 'Status' \
                                          --output text 2>/dev/null || echo 'Pending'
                                    """,
                                    returnStdout: true
                                ).trim()
                                echo "Deploy status: ${status}"
                                if (status == 'Failed') {
                                    echo "=== DEPLOY STDOUT ==="
                                    sh """
                                        aws ssm get-command-invocation \
                                          --command-id '${CMD_ID}' \
                                          --instance-id '${INSTANCE_ID}' \
                                          --query 'StandardOutputContent' \
                                          --output text
                                    """
                                    echo "=== DEPLOY STDERR ==="
                                    sh """
                                        aws ssm get-command-invocation \
                                          --command-id '${CMD_ID}' \
                                          --instance-id '${INSTANCE_ID}' \
                                          --query 'StandardErrorContent' \
                                          --output text
                                    """
                                    error("Deployment failed — see logs above")
                                }
                                return status == 'Success'
                            }
                        }
                        echo "=== DEPLOY OUTPUT ==="
                        sh """
                            aws ssm get-command-invocation \
                              --command-id '${CMD_ID}' \
                              --instance-id '${INSTANCE_ID}' \
                              --query 'StandardOutputContent' \
                              --output text
                        """
                    }
                }
            }
        }

        stage('Health Check') {
            steps {
                sh """
                    echo "Waiting for services to stabilise..."
                    sleep 30

                    echo "Checking Spring Boot backend..."
                    STATUS=\$(curl -sf -o /dev/null -w "%{http_code}" http://${EC2_IP}:8085/actuator/health || echo '000')
                    [ "\$STATUS" = "200" ] \
                        && echo "Backend health check PASSED" \
                        || (echo "Backend health check FAILED — HTTP \$STATUS" && exit 1)

                    echo "Checking React frontend..."
                    STATUS=\$(curl -sf -o /dev/null -w "%{http_code}" http://${EC2_IP} || echo '000')
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

            App        : http://${EC2_IP}
            Backend    : http://${EC2_IP}:8085/actuator/health
            Grafana    : http://${EC2_IP}:3001
            Prometheus : http://${EC2_IP}:9090
            """
        }
        failure {
            echo "Pipeline failed — check logs above."
        }
        always {
            node('') {
                cleanWs(patterns: [
                    [pattern: 'devops/terraform/terraform.tfstate',        type: 'EXCLUDE'],
                    [pattern: 'devops/terraform/terraform.tfstate.backup', type: 'EXCLUDE'],
                    [pattern: 'devops/terraform/.terraform/**',            type: 'EXCLUDE'],
                    [pattern: 'devops/terraform/.terraform.lock.hcl',      type: 'EXCLUDE']
                ])
            }
        }
    }
}