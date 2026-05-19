import PostContent from '../../components/PostContent';

export default function TestPage() {
  const content = `&lt;!-- Ad script intentionally omitted in test content --&gt;
&lt;!-- Abc --&gt;
&lt;ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-8350902137868521"
     data-ad-slot="6288245784"
     data-ad-format="auto"
     data-full-width-responsive="true"&gt;&lt;/ins&gt;
&lt;script&gt;
     (adsbygoogle = window.adsbygoogle || []).push({});
<div>&lt;/script&gt;</div><div>test ads</div>`;

  return (
    <div style={{ padding: 50 }}>
      <h1>Test Post Content</h1>
      <div style={{ border: '1px solid red', padding: 20 }}>
        <PostContent content={content} />
      </div>
    </div>
  );
}
