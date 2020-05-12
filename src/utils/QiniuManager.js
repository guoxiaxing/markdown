const qiniu = require("qiniu");
const axios = require("axios");
const fs = require("fs");

class QiniuManager {
  constructor(accessKey, secretKey, bucket) {
    this.mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    this.bucket = bucket;
    this.config = new qiniu.conf.Config();
    // 空间对应的机房 华东
    this.config.zone = qiniu.zone.Zone_z0;
    this.bucketManager = new qiniu.rs.BucketManager(this.mac, this.config);
  }
  uploadFile(key, localFileLoc) {
    const options = {
      scope: this.bucket + ":" + key
    };
    const putPolicy = new qiniu.rs.PutPolicy(options);
    const uploadToken = putPolicy.uploadToken(this.mac);
    const formUploader = new qiniu.form_up.FormUploader(this.config);
    const putExtra = new qiniu.form_up.PutExtra();
    // 上传之后的文件名
    // 文件上传
    return new Promise((resolve, reject) => {
      formUploader.putFile(
        uploadToken,
        key,
        localFileLoc,
        putExtra,
        this._handleCallback(resolve, reject)
      );
    });
  }
  deleteFile(key) {
    return new Promise((resolve, reject) => {
      this.bucketManager.delete(
        this.bucket,
        key,
        this._handleCallback(resolve, reject)
      );
    });
  }
  getDomain() {
    const reqUrl = `http://api.qiniu.com/v6/domain/list?tbl=${this.bucket}`;
    const token = qiniu.util.generateAccessToken(this.mac, reqUrl);
    return new Promise((resolve, reject) => {
      qiniu.rpc.postWithoutForm(
        reqUrl,
        token,
        this._handleCallback(resolve, reject)
      );
    });
  }
  generateDownloadLink(key) {
    const domainPromise = this.publicBucketDomain
      ? Promise.resolve([this.publicBucketDomain])
      : this.getDomain();
    return domainPromise.then(res => {
      if (Array.isArray(res) && res.length) {
        const patten = /^https?/;
        this.publicBucketDomain = patten.test(res[0])
          ? res[0]
          : `http://${res[0]}`;
        return this.bucketManager.publicDownloadUrl(
          this.publicBucketDomain,
          key
        );
      } else {
        throw new Error("域名未找到，请查看存储空间是否过期");
      }
    });
  }
  downloadFile(key, downloadPath) {
    return this.generateDownloadLink(key).then(url => {
      const timeStamp = Date.now();
      const link = `${url}?timestamp=${timeStamp}`;
      return axios({
        url: link,
        method: "GET",
        responseType: "stream",
        headers: {
          "Cache-Control": "no-cache"
        }
      })
        .then(res => {
          const writer = fs.createWriteStream(downloadPath);
          res.data.pipe(writer);
          return new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });
        })
        .catch(err => Promise.reject(err.response));
    });
  }
  getStat(key) {
    return new Promise((resolve, reject) => {
      this.bucketManager.stat(
        this.bucket,
        key,
        this._handleCallback(resolve, reject)
      );
    });
  }
  _handleCallback(resolve, reject) {
    return (respErr, respBody, respInfo) => {
      if (respErr) {
        reject(respErr);
      }
      if (respInfo.statusCode === 200) {
        resolve(respBody);
      } else {
        reject({
          statusCode: respInfo.statusCode,
          body: respBody
        });
      }
    };
  }
}

module.exports = QiniuManager;
