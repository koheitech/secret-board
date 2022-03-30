FROM --platform=linux/x86_64 node:14.15.4

RUN apt-get update
RUN apt-get install -y locales vim tmux
RUN locale-gen ja_JP.UTF-8
RUN localedef -f UTF-8 -i ja_JP ja_JP
ENV LANG ja_JP.UTF-8
ENV TZ Asia/Tokyo
WORKDIR /app

RUN yarn global add pug@2.0.4
RUN yarn global add http-auth@4.1.9
RUN yarn global add sequelize@6.5.0
RUN yarn global add pg@8.5.1
RUN yarn global add pg-hstore@2.3.3
RUN yarn global add cookies@0.8.0
RUN yarn global add dayjs@1.10.4
RUN yarn global add htpasswd@2.4.4
