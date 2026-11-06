-- Reference images for the running shoe catalog (R-GEAR-02, #46).
-- Public bucket: the images are served by URL with no sign-in, so the
-- <img> tags need no signed URLs. Only the service role writes here:
-- there are no insert, update or delete policies on storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gear-catalog', 'gear-catalog', true, 512000, array['image/webp']);
