# 🚀 AWS Production Deployment Guide
**Project: CLiNt Terra & EnVo**  
**Frontend:** AWS Amplify Hosting (Next.js App Router)  
**Backend:** AWS Lambda + Amazon API Gateway (Serverless Express)

---

## 📑 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Phase 1: Backend Deployment (AWS Lambda + API Gateway)](#phase-1-backend-deployment-aws-lambda--api-gateway)
   - [Option A: AWS Management Console (No CLI needed)](#option-a-aws-management-console-easiest--recommended)
   - [Option B: Serverless Framework CLI](#option-b-serverless-framework-cli)
3. [Phase 2: Frontend Deployment (AWS Amplify Console)](#phase-2-frontend-deployment-aws-amplify-console)
4. [Phase 3: Connect Frontend to Backend](#phase-3-connect-frontend-to-backend)
5. [Verification & Smoke Testing](#verification--smoke-testing)

---

## 1. Prerequisites
- An active **AWS Account** ([aws.amazon.com](https://aws.amazon.com/)).
- A free **MongoDB Atlas** cluster ([mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)) — required because AWS Lambda is stateless and ephemeral.
- Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket) for Amplify CI/CD.

---

## Phase 1: Backend Deployment (AWS Lambda + API Gateway)

### Option A: AWS Management Console (Easiest / No CLI needed)

Your production-ready Lambda package has already been compiled at:  
📁 `backend/lambda-deployment.zip` (Only ~6.3 MB!)

#### Step 1: Create the Lambda Function
1. Open the [AWS Lambda Console](https://console.aws.amazon.com/lambda).
2. Choose your preferred region (e.g. **Asia Pacific (Mumbai) `ap-south-1`** or **US East (N. Virginia) `us-east-1`**).
3. Click **Create function**.
4. Choose **Author from scratch**:
   - **Function name**: `clint-terra-api`
   - **Runtime**: `Node.js 20.x`
   - **Architecture**: `x86_64`
5. Click **Create function**.

#### Step 2: Upload the Zip Package
1. On the function page, scroll to **Code source**.
2. Click **Upload from** ➔ **.zip file**.
3. Choose the generated `backend/lambda-deployment.zip` and click **Save**.
4. Scroll down to **Runtime settings** and click **Edit**:
   - **Handler**: Change to `lambda.handler`
   - Click **Save**.

#### Step 3: Configure Environment Variables & Timeout
1. In the Lambda function tabs, click **Configuration** ➔ **General configuration** ➔ **Edit**:
   - **Timeout**: Set to `0 min 20 sec` (prevents external API timeouts).
   - **Memory**: `512 MB`.
   - Click **Save**.
2. Click **Configuration** ➔ **Environment variables** ➔ **Edit**:
   Add the following:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `clint-envo-secure-jwt-secret-key-2026-production`
   - `MONGODB_URI`: *Your MongoDB Atlas connection URI*
   - `DATA_GOV_IN_API_KEY`: `579b464db66ec23bdd000001cc1b62a999bf49426bc7525eb990343f`
   - `GEMINI_API_KEY`: *(Optional) Your Gemini API Key*
   - `RESEND_API_KEY`: *(Optional) Your Resend API Key*
   - `GMAIL_USER`: *(Optional) Your Gmail address*
   - `GMAIL_APP_PASSWORD`: *(Optional) Your Gmail App Password*
   - Click **Save**.

#### Step 4: Create the Amazon API Gateway (HTTP API)
1. Open the [Amazon API Gateway Console](https://console.aws.amazon.com/apigateway).
2. Click **Create API**.
3. Under **HTTP API**, click **Build**.
4. Configure integrations:
   - Click **Add integration** and choose **Lambda**.
   - Select your Lambda function: `clint-terra-api`.
   - **API name**: `clint-terra-http-api`.
   - Click **Next**.
5. Configure routes:
   - Method: `ANY`
   - Resource path: `/{proxy+}`
   - Click **Add route**: Method: `ANY`, Resource path: `/` (both point to `clint-terra-api`).
   - Click **Next**.
6. Stages: Leave default (`$default` with Auto-deploy enabled). Click **Next** ➔ **Create**.
7. **Enable CORS**:
   - In the API Gateway left navigation, click **CORS** ➔ **Configure**:
   - **Access-Control-Allow-Origin**: `*`
   - **Access-Control-Allow-Headers**: `Content-Type, Authorization, x-api-key`
   - **Access-Control-Allow-Methods**: `GET, POST, PUT, DELETE, OPTIONS`
   - Click **Save**.
8. **Copy your Invoke URL**:
   Example: `https://a1b2c3d4.execute-api.ap-south-1.amazonaws.com`

---

### Option B: Serverless Framework CLI (Automated)

If you have the AWS CLI configured on your computer:
```bash
cd backend
npx serverless deploy
```
*Serverless Framework will automatically create the Lambda function, HTTP API Gateway, and output your API Invoke URL.*

---

## Phase 2: Frontend Deployment (AWS Amplify Console)

AWS Amplify natively hosts Next.js 16 App Router with automated CloudFront CDN and SSL.

### Step 1: Push Project to Git
Commit and push your project to GitHub, GitLab, or Bitbucket:
```bash
git add .
git commit -m "Configure AWS Amplify and Lambda Serverless production deployment"
git push origin main
```

### Step 2: Connect Git to AWS Amplify
1. Open the [AWS Amplify Console](https://console.aws.amazon.com/amplify).
2. Click **Create new app** (or **Host web app**).
3. Select your repository provider (e.g. **GitHub**) and click **Next**.
4. Select repository and branch `main`.
5. Check **Connecting a monorepo?** and enter the app root:
   - **App root**: `frontend`
6. Click **Next**.

### Step 3: Verify Amplify Build Settings
Amplify will auto-detect the `frontend/amplify.yml` we configured:
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - env | grep -e NEXT_PUBLIC_ >> .env.production
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - node_modules/**/*
```

### Step 4: Add Environment Variable
Under **Advanced settings** (or in App settings ➔ Environment variables):
- **Key**: `NEXT_PUBLIC_BACKEND_URL`
- **Value**: Your API Gateway Invoke URL from Phase 1  
  *(Example: `https://a1b2c3d4.execute-api.ap-south-1.amazonaws.com` — do NOT include trailing slash)*

Click **Save and deploy**.

Amplify will automatically build and publish your app to a live URL (e.g. `https://main.d1234abcd.amplifyapp.com`).

---

## Phase 3: Connect Frontend to Backend

1. In AWS Amplify, navigate to your App ➔ **App settings** ➔ **Environment variables**.
2. Verify `NEXT_PUBLIC_BACKEND_URL` matches your API Gateway URL.
3. If you ever update this variable, click **Run build** in Amplify to re-generate the static assets with the new endpoint.

---

## Verification & Smoke Testing

### 1. Test Backend API Gateway:
Open your browser or run:
```bash
curl https://your-api-id.execute-api.ap-south-1.amazonaws.com/api/integrations/status?ping=true
```
Expected output:
```json
{
  "success": true,
  "pingLatencies": { "openMeteo": "700ms" },
  "services": {
    "openMeteo": { "status": "connected" },
    "cpcbIndia": { "status": "connected" }
  }
}
```

### 2. Test Frontend on Amplify:
1. Open your live Amplify URL (`https://main.d1234abcd.amplifyapp.com`).
2. Verify the 3D WebGL Biosphere loads and renders in dark mode.
3. Switch to the **Air Quality (AQI)** tab and search for any city (e.g. Delhi, Mumbai, Bengaluru).
4. Click the **Settings ⚙️** icon in the top header and click **Ping Connectors** to ensure your Amplify frontend successfully communicates with your AWS Lambda backend.
