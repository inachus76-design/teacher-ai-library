# 교사 연수자료실 배포

1. 이 프로젝트의 worker.mjs, schema.sql, wrangler.toml, outputs/index.html을 GitHub 저장소의 main 브랜치에 올립니다.
2. Cloudflare 계정에서 npx wrangler login으로 로그인하고 npx wrangler d1 create teacher-ai-library를 실행합니다.
3. Cloudflare가 반환한 database_id를 wrangler.toml에 넣은 뒤 npx wrangler d1 execute teacher-ai-library --remote --file=schema.sql을 실행합니다. 설정 변경을 main에 커밋합니다.
4. Cloudflare Workers & Pages에서 Git 저장소 가져오기로 해당 GitHub 저장소를 연결합니다. Worker 이름은 teacher-ai-library, 프로덕션 브랜치는 main, 배포 명령은 npx wrangler deploy로 지정합니다. 이후 main에 푸시하면 자동 배포됩니다.
5. 배포 URL에서 가입하고 자료를 저장합니다. 다른 브라우저에서 공유 링크를 열어 배지를 확인하고, 같은 계정으로 로그인해 관리자 영역이 나타나는지 확인합니다.

공유 링크로 열람할 수 있는 자료에는 첨부파일이 포함됩니다. 수정 권한은 자료실 소유 계정에만 부여됩니다. 기존 단일 HTML 파일에서 브라우저에 저장한 데이터는 배포 주소로 자동 이전되지 않습니다. 첨부파일은 자료실 전체 기준으로 인코딩 후 약 900KB까지 저장할 수 있습니다.
