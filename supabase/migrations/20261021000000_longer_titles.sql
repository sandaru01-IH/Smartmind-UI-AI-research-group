-- Paper titles can run past 160 characters. Allow up to 250; tags may be up to 50 characters (the app checks tags).
alter table public.posts drop constraint posts_title_check;
alter table public.posts add constraint posts_title_check check (char_length(title) between 3 and 250);
