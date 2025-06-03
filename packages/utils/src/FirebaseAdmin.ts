import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      //   projectId: process.env.FIREBASE_PROJECT_ID,
      //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      //   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      projectId: "travel-app-93f39",
      clientEmail:
        "firebase-adminsdk-fbsvc@travel-app-93f39.iam.gserviceaccount.com",
      privateKey: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCRNI4VKAKv55KB
L085hcMATv3z6WWJ5sWoS5OxNrRX+B8GTByuif9VNRGuyajC7ZHrvG0uvcFI9RgO
JTJKWhDkeanrdc6jCukDsoW6J8ITQx2W4FtD1tzvXG2scvuWdKZVMpMj8n1e2yhx
+jDXxJ8QbJvT3Rpl/ic6Llw03ghIJBZwfmksdCC5B/22Ir0acnz/5q78+jJ3bvUS
LwtnDigoiMezsB2YT22+aGtX7wJmNdj0bOz1PHKvP+kKCijXaM5QU/VYDp4XtQIQ
/TlkUWhcyy2adjNl5nE0K7rc5c4c8MdKdJtJ3Xf6nt/dCbb8YOR5Ao7auBUJUwyD
G5phL1P9AgMBAAECggEAA1Z8b6MQUL/Xf825Gf7nqSGnt8wlL+LUp1Y5amjyA1Wq
TOhB/ocgjfJe2jA7h2OTp6IYtmrZPxaXO3gCbHAelEnxrH50Rg4xpgqcBVf1n6C6
1OWKY4hUYtIymTS5cM90pV+4vypLVHtgNiKErekQqP1+JYQfH7oUZ8N6DiMOeK4G
z8NaYK8onF3jo4fqiVvvun9ml6PCAxvWIwXbPI/4JBwEPXbXKe6UYLVLBo89bRuG
grpdDgUY4nBH4ZHkxjUclIajSugc3z4+4jHicBJUrFJh1QsT2KgNFAXhbdyxpfN8
klbU0ngqIkXQSp1MukNI3Au7BNPyki0ko6sZFJ1fhwKBgQDLGfQssy3SQxSL1A1s
WelZTZqT4J0CqogbMsPxItNRUG6NEPqpTffw9FAaWCYBVPhplnCECeapakJTgZ79
l0cGnm4hLRl+ar4MmP0AbwdkxstDqkfdQwZnAz671GCvUvxJbzCvxFguYVgNr4m9
/qppV61R38n3BEruDGt5RMaq5wKBgQC3Bk4OlhJXt7bHXySDQnO2nMd1wwGRiHIR
NX09tfaT4NO7yS8wBF/C6/eQqcFcF0fdm9yrd4B0d9tJ8HRJZV23cXUGoSj9dYwi
2apM2PM5ForkANl5nKXMfmvFubyECu4zSWWJ7jMxkHL98m8BpZoU8il4XGQQ6fn2
DWA4RTMxewKBgGD01OH576fuqgJOitHs4j7lkyOBGLNLIYqKY4vb6jFpSj1Bm8fz
FqgKmarZ5drA643MaY4/A8Rgm6Utve6lpxx7yWtBEmiNIIj3B+CLIGZ1mFeHFKOF
+ap3nB0it706yoFr+TwPaWFKyzRNVl5DEqsTVgQ95zZq8DJP74aG1KiFAoGBAKxJ
Zxkb89BWw9wRl9FnsH1qP+h+1O8mPhos++QnciHqNeZDkAPnWi2m6rhm0/nYgHH/
0k4mg+kfGnITw6ODpCCW0M6YznkpOe1kcIc+glZu/fd7RTzRVNGW/+R03xx9HZVx
tf+NFuvFSjn7CLvII68r9hWzAw9Y8U/Jb5YIrhQZAoGAV05ddrcD8R+jXH9gHTRy
tpcrsiAirsYM1j7SdK6HgIDEfPsfZmIiOTkCPgr+C09YiabYw1UGNTUTdTirnJTJ
R6oFd7vvRqd8DBC5L6EBB5MuAAUsMsqGVfV7RJVc01wvJnAI3aWRbo/Wb8PPaLeB
Skoj8i4fy4jExCJ+f/tErFI=
-----END PRIVATE KEY-----`,
    }),
  });
}

export { admin };
