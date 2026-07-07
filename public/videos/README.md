# 教学视频资源

最快上线时，如果视频小于 100MB，可以把课程视频放在本目录，默认文件名：

- `papermaking-course.mp4`
- `papermaking-poster.webp`
- `papermaking-course.zh.vtt`（可选）
- `papermaking-course.webm`（可选）

默认数据库 seed 会创建 `/videos/papermaking-course.mp4` 的视频资源和 10 个可编辑知识点 marker。

如果视频超过 100MB，不建议提交到 GitHub / Vercel。请上传到外部可公网访问地址，并在 Render 后端设置：

```env
VIDEO_BASE_URL=https://你的外部视频目录
```

或直接在数据库 `VideoResource.src` 中配置完整视频 URL。
