-- Quick updates now also appear in the news feed, not only in the ticker ribbon.
update public.posts set show_in_news = true where type = 'update';
